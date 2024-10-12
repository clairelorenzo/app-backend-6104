import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Commenting, Friending, GoalSetting, Posting, Scheduling, Sessioning } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";
import { CommentOptions } from "./concepts/commenting";
import { GoalOptions } from "./concepts/goal_setting";
import { EventOptions } from "./concepts/scheduling";

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
  @Router.get("/comments")
  async getComments(postId: string) {
    console.log(postId);
    const postObjectId = new ObjectId(postId);
    console.log(postObjectId);
    const comments = await Commenting.getCommentsForPost(postObjectId);
    console.log("Comments from DB:", comments);
    return Responses.comments(comments);
  }
  @Router.post("/comments")
  async createComment(session: SessionDoc, postId: string, content: string, options?: CommentOptions) {
    const user = Sessioning.getUser(session);
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
  async deleteComment(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const commentObjectId = new ObjectId(id);
    await Commenting.assertAuthorIsUser(commentObjectId, user);
    return Commenting.delete(commentObjectId);
  }

  @Router.get("/events")
  async getEvents(author: string) {
    let authorEvents;
    const id = (await Authing.getUserByUsername(author))._id;
    authorEvents = await Scheduling.getEventsByUser(id);
    return Responses.events(authorEvents);
  }

  @Router.post("/events")
  async createEvent(session: SessionDoc, name: string, startTime: string, endTime: string, type: "focus" | "social") {
    const user = Sessioning.getUser(session);
    const created = await Scheduling.create(user, name, startTime, endTime, { type });
    return { msg: created.msg, event: await Responses.event(created.event) };
  }

  @Router.patch("/events/:id")
  async updateEvent(session: SessionDoc, id: string, name?: string, startTime?: string, endTime?: string, options?: EventOptions) {
    const user = Sessioning.getUser(session);
    const eventId = new ObjectId(id);
    await Scheduling.assertUserIsOwner(eventId, user);
    return await Scheduling.update(eventId, name, startTime, endTime, options);
  }

  @Router.delete("/events/:id")
  async deleteEvent(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const eventId = new ObjectId(id);
    await Scheduling.assertUserIsOwner(eventId, user);
    return Scheduling.delete(eventId);
  }

  // Outline of remaining routes

  // GOALS
  @Router.get("/goals")
  async getGoals(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const goals = await GoalSetting.getByAuthor(user);
    return Responses.goals(goals);
  }
  @Router.post("/goals")
  async createGoal(session: SessionDoc, content: string, options?: GoalOptions) {
    const user = Sessioning.getUser(session);
    const created = await GoalSetting.create(user, content);
    return { msg: created.msg, goal: await Responses.goal(created.goal) };
  }
  @Router.delete("/goals/:id")
  async deleteGoal(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const goalId = new ObjectId(id);
    await GoalSetting.assertAuthorIsUser(goalId, user);
    return await GoalSetting.delete(goalId);
  }
}
/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
