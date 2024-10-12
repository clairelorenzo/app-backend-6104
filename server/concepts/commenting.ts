import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface CommentOptions {
  isPinned?: boolean;
}

export interface CommentDoc extends BaseDoc {
  postId: ObjectId;
  author: ObjectId;
  content: string;
  options?: CommentOptions;
}

/**
 * concept: Commenting [Author]
 */
export default class CommentingConcept {
  public readonly comments: DocCollection<CommentDoc>;

  /**
   * Make an instance of Commenting.
   */
  constructor(collectionName: string) {
    this.comments = new DocCollection<CommentDoc>(collectionName);
  }

  async create(postId: ObjectId, author: ObjectId, content: string, options?: CommentOptions) {
    const _id = await this.comments.createOne({ postId, author, content, options });
    return { msg: "Comment successfully created!", comment: await this.comments.readOne({ _id }) };
  }

  async getCommentsForPost(postId: ObjectId) {
    // Returns all comments for a given post
    ("");

    return await this.comments.readMany({ postId: postId });
  }

  async getByAuthor(author: ObjectId) {
    return await this.comments.readMany({ author });
  }

  async update(_id: ObjectId, content?: string, options?: CommentOptions) {
    // Similar to the post update function, undefined fields won't be updated
    await this.comments.partialUpdateOne({ _id }, { content, options });
    return { msg: "Comment successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.comments.deleteOne({ _id });
    return { msg: "Comment deleted successfully!" };
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const comment = await this.comments.readOne({ _id });
    if (!comment) {
      throw new NotFoundError(`Comment ${_id} does not exist!`);
    }
    if (comment.author.toString() !== user.toString()) {
      throw new CommentAuthorNotMatchError(user, _id);
    }
  }
}

export class CommentAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of comment {1}!", author, _id);
  }
}
