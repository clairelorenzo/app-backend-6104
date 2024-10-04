import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface EventOptions {
  type: "focus" | "social" | undefined; // Event type can be either focus or social
}

export interface EventDoc extends BaseDoc {
  user: ObjectId; // Reference to the user who created the event
  name: string;
  startTime: Date;
  endTime: Date;
  options: EventOptions;
}

/**
 * Concept: Scheduling (events).
 */
export default class SchedulingConcept {
  public readonly events: DocCollection<EventDoc>;

  /**
   * Make an instance of Scheduling.
   */
  constructor(collectionName: string) {
    this.events = new DocCollection<EventDoc>(collectionName);
  }

  // Create a new event
  async create(user: ObjectId, name: string, startTime: Date, endTime: Date, options: EventOptions) {
    const _id = await this.events.createOne({ user, name, startTime, endTime, options });
    return { msg: "Event successfully created!", event: await this.events.readOne({ _id }) };
  }

  // Get all events for a specific user
  async getEventsByUser(user: ObjectId) {
    return await this.events.readMany({ user }, { sort: { startTime: 1 } }); // Sorted by start time
  }

  // Update an event
  async update(_id: ObjectId, name?: string, startTime?: Date, endTime?: Date, options?: EventOptions) {
    await this.events.partialUpdateOne({ _id }, { name, startTime, endTime, options });
    return { msg: "Event successfully updated!" };
  }

  // Delete an event
  async delete(_id: ObjectId) {
    await this.events.deleteOne({ _id });
    return { msg: "Event deleted successfully!" };
  }

  // Ensure the user is the owner of the event
  async assertUserIsOwner(_id: ObjectId, user: ObjectId) {
    const event = await this.events.readOne({ _id });
    if (!event) {
      throw new NotFoundError(`Event ${_id} does not exist!`);
    }
    if (event.user.toString() !== user.toString()) {
      throw new EventOwnerNotMatchError(user, _id);
    }
  }
}

export class EventOwnerNotMatchError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the owner of event {1}!", user, _id);
  }
}
