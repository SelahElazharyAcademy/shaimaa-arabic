// مولَّد من قاعدة بيانات Supabase — لا يُعدَّل يدويًا.
// إعادة التوليد: npm run db:types  (يتطلب SUPABASE_ACCESS_TOKEN)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activation_codes: {
        Row: {
          batch: string | null
          code: string
          course_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          grants_days: number | null
          id: string
          status: Database["public"]["Enums"]["code_status"]
          updated_at: string
        }
        Insert: {
          batch?: string | null
          code: string
          course_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          grants_days?: number | null
          id?: string
          status?: Database["public"]["Enums"]["code_status"]
          updated_at?: string
        }
        Update: {
          batch?: string | null
          code?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          grants_days?: number | null
          id?: string
          status?: Database["public"]["Enums"]["code_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_codes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activation_redemptions: {
        Row: {
          code_id: string
          enrollment_id: string
          id: string
          redeemed_at: string
          student_id: string
        }
        Insert: {
          code_id: string
          enrollment_id: string
          id?: string
          redeemed_at?: string
          student_id: string
        }
        Update: {
          code_id?: string
          enrollment_id?: string
          id?: string
          redeemed_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "activation_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_redemptions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_redemptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          external_url: string | null
          created_at: string
          created_by: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          external_url?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          file_size: number | null
          id?: string
          mime_type: string | null
          storage_path: string | null
          title: string
          updated_at?: string
        }
        Update: {
          external_url?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_attachments: {
        Row: {
          attachment_id: string
          course_id: string
          created_at: string
        }
        Insert: {
          attachment_id: string
          course_id: string
          created_at?: string
        }
        Update: {
          attachment_id?: string
          course_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_attachments_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_attachments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          grade_id: string | null
          id: string
          price: number
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          grade_id?: string | null
          id?: string
          price?: number
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          grade_id?: string | null
          id?: string
          price?: number
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      education_stages: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          name_ar: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          name_ar: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          name_ar?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      governorates: {
        Row: {
          created_at: string
          id: string
          name_ar: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name_ar: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name_ar?: string
          sort_order?: number
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          source: string
          started_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          source?: string
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          source?: string
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_answers: {
        Row: {
          answer_text: string | null
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          option_ids: string[]
          points_earned: number
          question_id: string
        }
        Insert: {
          answer_text?: string | null
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          option_ids?: string[]
          points_earned?: number
          question_id: string
        }
        Update: {
          answer_text?: string | null
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          option_ids?: string[]
          points_earned?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          exam_id: string
          expires_at: string | null
          id: string
          max_score: number | null
          passed: boolean | null
          percentage: number | null
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          attempt_number: number
          created_at?: string
          exam_id: string
          expires_at?: string | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          percentage?: number | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          attempt_number?: number
          created_at?: string
          exam_id?: string
          expires_at?: string | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          percentage?: number | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          correct_text: string | null
          created_at: string
          exam_id: string
          explanation: string | null
          id: string
          points: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          correct_text?: string | null
          created_at?: string
          exam_id: string
          explanation?: string | null
          id?: string
          points?: number
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          correct_text?: string | null
          created_at?: string
          exam_id?: string
          explanation?: string | null
          id?: string
          points?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          ends_at: string | null
          id: string
          is_published: boolean
          lesson_id: string | null
          max_attempts: number | null
          passing_percentage: number
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          max_attempts?: number | null
          passing_percentage?: number
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          max_attempts?: number | null
          passing_percentage?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          stage_id: string | null
          created_at: string
          description: string | null
          id: string
          is_visible: boolean
          name_ar: string
          name_en: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          stage_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name_ar: string
          name_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          stage_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name_ar?: string
          name_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "education_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_attachments: {
        Row: { attachment_id: string; created_at: string; lesson_id: string }
        Insert: { attachment_id: string; created_at?: string; lesson_id: string }
        Update: { attachment_id?: string; created_at?: string; lesson_id?: string }
        Relationships: [
          {
            foreignKeyName: "lesson_attachments_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_attachments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          last_watched_at: string
          lesson_id: string
          progress_percent: number
          student_id: string
          updated_at: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_watched_at?: string
          lesson_id: string
          progress_percent?: number
          student_id: string
          updated_at?: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_watched_at?: string
          lesson_id?: string
          progress_percent?: number
          student_id?: string
          updated_at?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_videos: {
        Row: {
          allow_download: boolean
          bunny_video_id: string | null
          required_percent: number
          storage_path: string | null
          created_at: string
          lesson_id: string
          provider: string
          updated_at: string
          video_url: string
        }
        Insert: {
          allow_download?: boolean
          bunny_video_id?: string | null
          required_percent?: number
          storage_path?: string | null
          created_at?: string
          lesson_id: string
          provider?: string
          updated_at?: string
          video_url: string
        }
        Update: {
          allow_download?: boolean
          bunny_video_id?: string | null
          required_percent?: number
          storage_path?: string | null
          created_at?: string
          lesson_id?: string
          provider?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_videos_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          publish_at: string | null
          section: Database["public"]["Enums"]["student_section"] | null
          course_id: string
          created_at: string
          description: string | null
          duration_seconds: number
          has_video: boolean
          id: string
          is_free: boolean
          is_published: boolean
          module_id: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          publish_at?: string | null
          section?: Database["public"]["Enums"]["student_section"] | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_seconds?: number
          has_video?: boolean
          id?: string
          is_free?: boolean
          is_published?: boolean
          module_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          publish_at?: string | null
          section?: Database["public"]["Enums"]["student_section"] | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number
          has_video?: boolean
          id?: string
          is_free?: boolean
          is_published?: boolean
          module_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          recording_url: string | null
          starts_at: string
          status: Database["public"]["Enums"]["live_status"]
          stream_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          recording_url?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["live_status"]
          stream_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          recording_url?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["live_status"]
          stream_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          description: string
          key: string
          label: string
          placeholders: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          description?: string
          key: string
          label: string
          placeholders?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          description?: string
          key?: string
          label?: string
          placeholders?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          governorate_id: string | null
          school_name: string | null
          section: Database["public"]["Enums"]["student_section"] | null
          stage_id: string | null
          avatar_url: string | null
          allowed_pages: string[] | null
          created_at: string
          email: string
          full_name: string
          grade_id: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          governorate_id?: string | null
          school_name?: string | null
          section?: Database["public"]["Enums"]["student_section"] | null
          stage_id?: string | null
          avatar_url?: string | null
          allowed_pages?: string[] | null
          created_at?: string
          email: string
          full_name: string
          grade_id?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          governorate_id?: string | null
          school_name?: string | null
          section?: Database["public"]["Enums"]["student_section"] | null
          stage_id?: string | null
          avatar_url?: string | null
          allowed_pages?: string[] | null
          created_at?: string
          email?: string
          full_name?: string
          grade_id?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "education_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      static_pages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "static_pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_devices: {
        Row: {
          created_at: string
          device_id: string
          id: string
          ip: string | null
          last_seen_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          message: string | null
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          last_message_at: string
          status: Database["public"]["Enums"]["ticket_status"]
          student_id: string
          subject: string | null
          type: Database["public"]["Enums"]["ticket_type"]
          unread_for_staff: number
          unread_for_student: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          student_id: string
          subject?: string | null
          type?: Database["public"]["Enums"]["ticket_type"]
          unread_for_staff?: number
          unread_for_student?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          student_id?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["ticket_type"]
          unread_for_staff?: number
          unread_for_student?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_staff_account: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_pages?: string[] | null
        }
        Returns: string
      }
      register_device: {
        Args: { p_device_id: string; p_ip?: string; p_user_agent?: string }
        Returns: boolean
      }
      reset_student_devices: {
        Args: { p_student: string }
        Returns: number
      }
      set_admin_pages: {
        Args: { p_pages: string[] | null; p_user: string }
        Returns: boolean
      }
      set_account_password: {
        Args: { p_password: string; p_user: string }
        Returns: boolean
      }
      create_manual_enrollment: {
        Args: { p_course: string; p_expires_at?: string; p_student: string }
        Returns: Json
      }
      generate_activation_codes: {
        Args: {
          p_batch?: string
          p_course: string
          p_expires_at?: string
          p_grants_days?: number
          p_quantity: number
        }
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      get_exam_attempt_questions: { Args: { p_attempt: string }; Returns: Json }
      get_exam_attempt_review: { Args: { p_attempt: string }; Returns: Json }
      get_student_progress: { Args: { p_student?: string }; Returns: Json }
      mark_notification_read: { Args: { p_id?: string }; Returns: number }
      mark_support_read: { Args: { p_ticket: string }; Returns: undefined }
      move_exam_question: {
        Args: { p_dir: string; p_question: string }
        Returns: boolean
      }
      move_lesson: {
        Args: { p_dir: string; p_lesson: string }
        Returns: boolean
      }
      redeem_activation_code: { Args: { p_code: string }; Returns: Json }
      start_exam_attempt: { Args: { p_exam: string }; Returns: Json }
      submit_exam: {
        Args: { p_answers: Json; p_attempt: string }
        Returns: Json
      }
    }
    Enums: {
      account_status: "active" | "suspended"
      attempt_status: "in_progress" | "submitted" | "expired"
      code_status: "active" | "used" | "expired" | "cancelled"
      course_status: "draft" | "published" | "archived"
      enrollment_status: "active" | "expired" | "cancelled"
      live_status: "scheduled" | "live" | "ended" | "cancelled"
      student_section: "scientific" | "literary"
      question_type:
        | "single_choice"
        | "multiple_choice"
        | "true_false"
        | "short_answer"
      ticket_status: "open" | "pending" | "resolved" | "closed"
      ticket_type:
        | "curriculum_question"
        | "subscription_problem"
        | "technical_problem"
        | "other"
      user_role: "student" | "support" | "admin" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended"],
      attempt_status: ["in_progress", "submitted", "expired"],
      code_status: ["active", "used", "expired", "cancelled"],
      course_status: ["draft", "published", "archived"],
      enrollment_status: ["active", "expired", "cancelled"],
      live_status: ["scheduled", "live", "ended", "cancelled"],
      student_section: ["scientific", "literary"],
      question_type: [
        "single_choice",
        "multiple_choice",
        "true_false",
        "short_answer",
      ],
      ticket_status: ["open", "pending", "resolved", "closed"],
      ticket_type: [
        "curriculum_question",
        "subscription_problem",
        "technical_problem",
        "other",
      ],
      user_role: ["student", "support", "admin", "super_admin"],
    },
  },
} as const
