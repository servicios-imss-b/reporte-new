export type Rating = 'Buena' | 'Mala' | 'Regular';
export type RatingCounts = Record<Rating, number>;

export interface AnswerCount {
  name: string;
  value: number;
}

export interface QuestionSummary {
  question: string;
  total: number;
  answers: AnswerCount[];
}

export interface FormationRating {
  formation: string;
  total: number;
  Buena: number;
  Mala: number;
  Regular: number;
}

export interface EntityRating {
  entity: string;
  total: number;
  ratings: RatingCounts;
  formationRatings: FormationRating[];
  questions: QuestionSummary[];
}

export interface CluesReport {
  clues: string;
  hospital: string;
  entity: string;
  total: number;
  ratingDistribution: RatingCounts;
  formationRatings: FormationRating[];
  questions: QuestionSummary[];
}

export interface ReportData {
  generatedAt: string;
  totalResponses: number;
  entities: string[];
  ratingDistribution: RatingCounts;
  formationRatings: FormationRating[];
  entityRatings: EntityRating[];
  cluesReports: CluesReport[];
  questions: QuestionSummary[];
}
