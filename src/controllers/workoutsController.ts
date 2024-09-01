import { Request, Response } from 'express';
import db from '../config/db';
import { Workout } from '../models/workout.model';
import { ExerciseWithSeries } from '../models/ExerciseWithSeries.model';
import { RowDataPacket } from 'mysql2';

export class WorkoutController {

  static async getWorkoutsByUser(req: Request, res: Response) {
    const { userId } = req.params;
  
    try {
      db.query('SELECT * FROM workouts WHERE user_id = ?', [userId], (err, workoutResults: RowDataPacket[]) => {
        if (err) {
          console.error('Error fetching workouts by user:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
  
        const workouts: Workout[] = [];
  
        let pendingQueries = workoutResults.length;
  
        if (pendingQueries === 0) {
          return res.status(200).json(workouts); // Return empty array if no workouts found
        }
  
        workoutResults.forEach((workoutRow: any) => {
          const workout: Workout = {
            id: workoutRow.id,
            name: workoutRow.name,
            category: workoutRow.category,
            exercises: [],
            user_id: workoutRow.user_id
          };
  
          db.query('SELECT * FROM exercises WHERE workout_id = ?', [workout.id], (err, exerciseResults: RowDataPacket[]) => {
            if (err) {
              console.error('Error fetching exercises:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }
  
            let pendingExerciseQueries = exerciseResults.length;
  
            if (pendingExerciseQueries === 0) {
              workouts.push(workout);
              pendingQueries -= 1;
              if (pendingQueries === 0) {
                res.status(200).json(workouts);
              }
              return;
            }
  
            exerciseResults.forEach((exerciseRow: any) => {
              const exercise: ExerciseWithSeries = {
                id: exerciseRow.id,
                name: exerciseRow.name,
                restTime: exerciseRow.rest_time,
                series: [],
                bodyPart: '',
                equipment: '',
                gifUrl: '',
                target: ''
              };
  
              db.query('SELECT * FROM series WHERE exercise_id = ?', [exercise.id], (err, seriesResults: RowDataPacket[]) => {
                if (err) {
                  console.error('Error fetching series:', err);
                  return res.status(500).json({ error: 'Internal server error' });
                }
  
                seriesResults.forEach((seriesRow: any) => {
                  exercise.series.push({
                    seriesNumber: seriesRow.id,
                    reps: seriesRow.reps,
                    weight: seriesRow.weight
                  });
                });
  
                workout.exercises.push(exercise);
                pendingExerciseQueries -= 1;
                if (pendingExerciseQueries === 0) {
                  workouts.push(workout);
                  pendingQueries -= 1;
                  if (pendingQueries === 0) {
                    res.status(200).json(workouts);
                  }
                }
              });
            });
          });
        });
      });
    } catch (error) {
      console.error('Error fetching workouts by user:', error);
      res.status(500).json({ error: 'Error fetching workouts by user' });
    }
  }

  static async createWorkout(req: Request, res: Response) {
    const { id, name, category, exercises, user_id } = req.body;
  
    try {
      const newWorkout: Workout = {
        id,
        name,
        category,
        exercises,
        user_id
      };
  
      db.beginTransaction((err) => {
        if (err) {
          throw err;
        }
  
        db.query('INSERT INTO workouts SET ?', { id: newWorkout.id, name: newWorkout.name, category: newWorkout.category, user_id: newWorkout.user_id }, (err, results) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error creating workout:', err);
              res.status(500).json({ error: 'Internal server error' });
            });
          }
  
          // Insert exercises and series
          newWorkout.exercises.forEach((exercise: { id: any; name: any; series: any; restTime: any; }) => {
            const { id: exerciseId, name: exerciseName, series, restTime } = exercise;
            db.query('INSERT INTO exercises SET ?', { id: exerciseId, name: exerciseName, workout_id: newWorkout.id, rest_time: restTime }, (err, results) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error creating exercise:', err);
                  res.status(500).json({ error: 'Internal server error' });
                });
              }
  
              series.forEach((serie: { seriesNumber: any; reps: any; weight: any; }) => {
                db.query('INSERT INTO series SET ?', { seriesNumber: serie.seriesNumber, exercise_id: exerciseId, reps: serie.reps, weight: serie.weight }, (err, results) => {
                  if (err) {
                    return db.rollback(() => {
                      console.error('Error creating series:', err);
                      res.status(500).json({ error: 'Internal server error' });
                    });
                  }
                });
              });
            });
          });
  
          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                console.error('Transaction commit failed:', err);
                res.status(500).json({ error: 'Internal server error' });
              });
            }
            console.log('Workout created successfully');
            res.status(201).json({ message: 'Workout created successfully' });
          });
        });
      });
    } catch (error) {
      console.error('Error creating workout:', error);
      res.status(500).json({ error: 'Error creating workout' });
    }
  }
  

 

  

  static async updateWorkout(req: Request, res: Response) {
    const { id } = req.params;
    const { name, category, exercises } = req.body;

    try {
      const updatedWorkout: Partial<Workout> = {
        name,
        category,
        exercises
      };

      // Start transaction
      db.beginTransaction((err) => {
        if (err) {
          throw err;
        }

        db.query('UPDATE workouts SET ? WHERE id = ?', [updatedWorkout, id], (err, results) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error updating workout:', err);
              res.status(500).json({ error: 'Internal server error' });
            });
          }

          // Delete old exercises and series
          db.query('DELETE FROM exercises WHERE workout_id = ?', [id], (err, results) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error deleting old exercises:', err);
                res.status(500).json({ error: 'Internal server error' });
              });
            }

            db.query('DELETE FROM series WHERE exercise_id IN (SELECT id FROM exercises WHERE workout_id = ?)', [id], (err, results) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error deleting old series:', err);
                  res.status(500).json({ error: 'Internal server error' });
                });
              }

              // Insert new exercises and series
              updatedWorkout.exercises!.forEach((exercise: { id: any; name: any; series: any; restTime: any; }) => {
                const { id: exerciseId, name: exerciseName, series, restTime } = exercise;
                db.query('INSERT INTO exercises SET ?', { id: exerciseId, name: exerciseName, workout_id: id, rest_time: restTime }, (err, results) => {
                  if (err) {
                    return db.rollback(() => {
                      console.error('Error creating exercise:', err);
                      res.status(500).json({ error: 'Internal server error' });
                    });
                  }

                  series.forEach((serie: { seriesNumber: any; rep: any; kg: any; }) => {
                    db.query('INSERT INTO series SET ?', { id: serie.seriesNumber, exercise_id: exerciseId, reps: serie.rep, weight: serie.kg }, (err, results) => {
                      if (err) {
                        return db.rollback(() => {
                          console.error('Error creating series:', err);
                          res.status(500).json({ error: 'Internal server error' });
                        });
                      }
                    });
                  });
                });
              });

              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Transaction commit failed:', err);
                    res.status(500).json({ error: 'Internal server error' });
                  });
                }
                console.log('Workout updated successfully');
                res.status(200).json({ message: 'Workout updated successfully' });
              });
            });
          });
        });
      });
    } catch (error) {
      console.error('Error updating workout:', error);
      res.status(500).json({ error: 'Error updating workout' });
    }
  }

  static async deleteWorkout(req: Request, res: Response) {
    const { id } = req.params;

    try {
      // Start transaction
      db.beginTransaction((err) => {
        if (err) {
          throw err;
        }

        db.query('DELETE FROM series WHERE exercise_id IN (SELECT id FROM exercises WHERE workout_id = ?)', [id], (err, results) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error deleting series:', err);
              res.status(500).json({ error: 'Internal server error' });
            });
          }

          db.query('DELETE FROM exercises WHERE workout_id = ?', [id], (err, results) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error deleting exercises:', err);
                res.status(500).json({ error: 'Internal server error' });
              });
            }

            db.query('DELETE FROM workouts WHERE id = ?', [id], (err, results) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error deleting workout:', err);
                  res.status(500).json({ error: 'Internal server error' });
                });
              }

              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Transaction commit failed:', err);
                    res.status(500).json({ error: 'Internal server error' });
                  });
                }
                console.log('Workout deleted successfully');
                res.status(200).json({ message: 'Workout deleted successfully' });
              });
            });
          });
        });
      });
    } catch (error) {
      console.error('Error deleting workout:', error);
      res.status(500).json({ error: 'Error deleting workout' });
    }
  }
}
