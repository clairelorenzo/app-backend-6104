import AuthenticatingConcept from "./concepts/authenticating";
import CommentingConcept from "./concepts/commenting";
import FriendingConcept from "./concepts/friending";
import GoalSettingConcept from "./concepts/goal_setting";
import PostingConcept from "./concepts/posting";
import SchedulingConcept from "./concepts/scheduling";
import SessioningConcept from "./concepts/sessioning";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts");
export const Friending = new FriendingConcept("friends");
export const Commenting = new CommentingConcept("comments");
export const Scheduling = new SchedulingConcept("schedule");
export const GoalSetting = new GoalSettingConcept("goals");
