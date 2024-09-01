import { Exercise } from './exercise.model';
import { Series } from './series.model';

export interface ExerciseWithSeries extends Exercise {
    series: Series[];
    restTime: number;
}