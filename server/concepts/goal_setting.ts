import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface GoalOptions {
  completed: string;
}

export interface GoalDoc extends BaseDoc {
  author: ObjectId;
  content: string;
  options?: GoalOptions;
}

/**
 * concept: Posting [Author]
 */
export default class GoalSettingConcept {
  public readonly goals: DocCollection<GoalDoc>;

  /**
   * Make an instance of Posting.
   */
  constructor(collectionName: string) {
    this.goals = new DocCollection<GoalDoc>(collectionName);
  }

  async create(author: ObjectId, content: string, options?: GoalOptions) {
    const _id = await this.goals.createOne({ author, content, options });
    return { msg: "Post successfully created!", goal: await this.goals.readOne({ _id }) };
  }

  async getGoals() {
    // Returns all posts! You might want to page for better client performance
    return await this.goals.readMany({}, { sort: { _id: -1 } });
  }

  async getByAuthor(author: ObjectId) {
    return await this.goals.readMany({ author });
  }

  async update(_id: ObjectId, content?: string, options?: GoalOptions) {
    // Note that if content or options is undefined, those fields will *not* be updated
    // since undefined values for partialUpdateOne are ignored.
    await this.goals.partialUpdateOne({ _id }, { content, options });
    return { msg: "Post successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.goals.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const goal = await this.goals.readOne({ _id });
    if (!goal) {
      throw new NotFoundError(`Goal ${_id} does not exist!`);
    }
    if (goal.author.toString() !== user.toString()) {
      throw new GoalAuthorNotMatchError(user, _id);
    }
  }
}

export class GoalAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}
