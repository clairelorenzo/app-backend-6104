import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Commenting, Friending, Posting, Scheduling, Sessioning } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";
import { CommentOptions } from "./concepts/commenting";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }
  @Router.get("/posts/:postId/comments")
  @Router.validate(z.object({ postId: z.string() }))
  async getComments(postId: string) {
    const postObjectId = new ObjectId(postId);
    const comments = await Commenting.getCommentsForPost(postObjectId);
    return Responses.comments(comments);
  }
  @Router.post("/comments/:postId")
  @Router.validate(z.object({ postId: z.string(), content: z.string().min(1) }))
  async createComment(session: SessionDoc, postId: string, content: string, options?: CommentOptions) {
    console.log("hey");
    const user = Sessioning.getUser(session);
    console.log("hey again");
    const postObjectId = new ObjectId(postId);
    const created = await Commenting.create(postObjectId, user, content, options);
    return { msg: created.msg, comment: await Responses.comment(created.comment) };
  }

  @Router.patch("/comments/:id")
  @Router.validate(z.object({ id: z.string(), content: z.string().optional() }))
  async updateComment(session: SessionDoc, id: string, content?: string, options?: CommentOptions) {
    const user = Sessioning.getUser(session);
    const commentObjectId = new ObjectId(id);
    await Commenting.assertAuthorIsUser(commentObjectId, user);
    return await Commenting.update(commentObjectId, content, options);
  }

  @Router.delete("/comments/:id")
  @Router.validate(z.object({ id: z.string() }))
  async deleteComment(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const commentObjectId = new ObjectId(id);
    await Commenting.assertAuthorIsUser(commentObjectId, user);
    return await Commenting.delete(commentObjectId);
  }
  @Router.get("/events")
  async getEvents(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const events = await Scheduling.getEventsByUser(user);
    return Responses.events(events);
  }

  @Router.post("/events")
  @Router.validate(
    z.object({
      name: z.string().min(1),
      startTime: z.string(), // Assuming ISO date string
      endTime: z.string(),
      type: z.enum(["focus", "social"]),
    }),
  )
  async createEvent(session: SessionDoc, name: string, startTime: string, endTime: string, type: "focus" | "social") {
    const user = Sessioning.getUser(session);
    const created = await Scheduling.create(user, name, new Date(startTime), new Date(endTime), { type });
    return { msg: created.msg, event: await Responses.event(created.event) };
  }

  @Router.patch("/events/:id")
  @Router.validate(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      type: z.enum(["focus", "social"]).optional(),
    }),
  )
  async updateEvent(session: SessionDoc, id: string, name?: string, startTime?: string, endTime?: string, type?: "focus" | "social") {
    const user = Sessioning.getUser(session);
    const eventId = new ObjectId(id);
    await Scheduling.assertUserIsOwner(eventId, user);
    return await Scheduling.update(eventId, name, startTime ? new Date(startTime) : undefined, endTime ? new Date(endTime) : undefined, { type });
  }

  @Router.delete("/events/:id")
  async deleteEvent(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const eventId = new ObjectId(id);
    await Scheduling.assertUserIsOwner(eventId, user);
    return await Scheduling.delete(eventId);
  }
}

// Outline of remaining routes

// GOALS
// @Router.get("/goals")
//   async getEvents(session: SessionDoc) {
//     const user = Sessioning.getUser(session);
//     const events = await GoalSetting.getGoalsByUser(user);
//     return Responses.goals(goals);
//   }

//   @Router.post("/go")
//   @Router.validate(
//     z.object({
//       content: z.string().min(1),
//     }),
//   )
//   async createGoal(session: SessionDoc, content: string) {
//     const user = Sessioning.getUser(session);
//     const created = await GoalSetting.create(user, content);
//     return { msg: created.msg, event: await Responses.event(created.event) };
//   }

//   @Router.patch("/goals/:id")
//   @Router.validate(
//     z.object({
//       id: z.string(),
//       content: z.string()
//     }),
//   )

//   @Router.delete("/gols/:id")
//   async deleteEvent(session: SessionDoc, id: string) {
//     const user = Sessioning.getUser(session);
//     const goalId = new ObjectId(id);
//     await Scheduling.assertUserIsOwner(goalId, user);
//     return await Scheduling.delete(eventId);
//   }

// Message
// @Router.get("/goals")
//   async getMessages(session: SessionDoc) {
//     const user = Sessioning.getUser(session);
//     const messages = await Messaging.getMessagesbyUser(user);
//     return Responses.goals(goals);
//   }

//   @Router.post("/go")
//   @Router.validate(
//     z.object({
//       content: z.string().min(1),
//     }),
//   )
//   async sendMessage(session: SessionDoc, content: string, to:string ) {
//     const user = Sessioning.getUser(session);
//     const created = await Messaging.create(user, content, to);
//     return { msg: created.msg, event: await Responses.event(created.event) };
//   }

//   @Router.patch("/goals/:id")
//   @Router.validate(
//     z.object({
//       content: z.string()
//       to: z.string()
//     }),
//   )

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
