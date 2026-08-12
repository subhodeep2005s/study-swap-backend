export type HallOfFameAchievementType = 
  | 'EXAM_CLEARED'
  | 'SCORE_IMPROVEMENT'
  | 'COLLEGE_ADMISSION'
  | 'JOB_PLACEMENT'
  | 'RANK_ACHIEVEMENT'
  | 'ACADEMIC_ACHIEVEMENT'
  | 'COMPETITION_ACHIEVEMENT'
  | 'CERTIFICATION'
  | 'SCHOLARSHIP'
  | 'COMEBACK'
  | 'CONSISTENCY'
  | 'OTHER';

export type HallOfFameMediaType = 'NONE' | 'IMAGE' | 'VIDEO';
export type HallOfFameStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface HallOfFame {
  id: string;
  title: string;
  short_description: string | null;
  story: string;
  person_name: string;
  person_role: string | null;
  achievement_type: HallOfFameAchievementType;
  achievement_year: number;
  result_label: string | null;
  result_before: string | null;
  result_after: string | null;
  country_id: string;
  media_type: HallOfFameMediaType;
  media_key: string | null;
  thumbnail_key: string | null;
  status: HallOfFameStatus;
  is_featured: boolean;
  views_count: number;
  likes_count: number;
  helpful_count: number;
  saves_count: number;
  comments_count: number;
  admin_id: string;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  deleted_by: string | null;
}

export interface HallOfFameEducationNode {
  hall_of_fame_id: string;
  education_node_id: string;
  created_at: Date;
}

export interface HallOfFameComment {
  id: string;
  hall_of_fame_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  deleted_by: string | null;
}

export interface HallOfFamePaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sort?: 'latest' | 'oldest' | 'trending' | 'most_liked' | 'most_helpful' | 'most_viewed' | 'most_saved';
}

export interface AdminHallOfFameFilters extends HallOfFamePaginationParams {
  country_id?: string;
  education_node_id?: string;
  achievement_type?: HallOfFameAchievementType;
  achievement_year?: number;
  status?: HallOfFameStatus;
  is_featured?: boolean;
  media_type?: HallOfFameMediaType;
  search?: string;
}

export interface PublicHallOfFameFilters extends HallOfFamePaginationParams {
  country_id?: string;
  education_node_id?: string;
  achievement_type?: HallOfFameAchievementType;
  achievement_year?: number;
  search?: string;
}
