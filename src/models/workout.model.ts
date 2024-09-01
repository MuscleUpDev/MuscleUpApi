import { ExerciseWithSeries } from "./ExerciseWithSeries.model";

export interface Workout {
    id: string;
    name: string;
    category: string;
    exercises: ExerciseWithSeries[];
    user_id: number;
  }
  