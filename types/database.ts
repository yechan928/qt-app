// supabase/migrations/0001_init.sql의 테이블과 1:1 대응하는 수동 타입.
// 스키마를 바꾸면 이 파일도 함께 고칠 것 (PLAN.md 리스크 §I-4 참고).

export type Profile = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
};

export type BibleVerse = {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  version: string;
};

export type Post = {
  id: string;
  user_id: string;
  qt_date: string;
  verse_ref: string;
  verse_text: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type PostShare = {
  id: string;
  post_id: string;
  group_id: string;
  shared_at: string;
};

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type Reaction = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type QtSection = {
  heading: string;
  verse_ref: string;
  verse_text: string;
};

export type QtSchedule = {
  id: string;
  qt_date: string;
  title: string;
  verse_ref: string;
  verse_text: string;
  summary: string;
  prayer: string;
  sections: QtSection[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

// @supabase/postgrest-js의 GenericTable/GenericSchema 형태를 그대로 따라야
// 쿼리 결과 타입이 제대로 추론된다(Relationships 누락 시 전부 `never`로 추론됨).
type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }, Partial<Profile>>;
      bible_verses: Table<BibleVerse, Omit<BibleVerse, 'id'>, Partial<BibleVerse>>;
      groups: Table<Group, never, never>; // insert/update는 클라이언트가 안 함(RPC 함수로만)
      group_members: Table<GroupMember, never, never>; // 위와 동일
      post_shares: Table<PostShare, never, never>; // 위와 동일 — create_post_with_shares RPC로만 생성
      posts: Table<Post, never, Partial<Post>>; // insert도 RPC 전용(공유 원자성 보장), update는 수정 기능용으로 직접 허용
      comments: Table<
        Comment,
        Partial<Comment> & Pick<Comment, 'post_id' | 'user_id' | 'content'>,
        Partial<Comment>
      >;
      reactions: Table<
        Reaction,
        Partial<Reaction> & Pick<Reaction, 'post_id' | 'user_id'>,
        Partial<Reaction>
      >;
      qt_schedule: Table<
        QtSchedule,
        Partial<QtSchedule> &
          Pick<QtSchedule, 'qt_date' | 'title' | 'verse_ref' | 'verse_text' | 'created_by'>,
        Partial<QtSchedule>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_group: { Args: { p_name: string }; Returns: Group };
      join_group_by_code: { Args: { p_code: string }; Returns: Group };
      create_post_with_shares: {
        Args: {
          p_qt_date: string;
          p_verse_ref: string;
          p_verse_text: string;
          p_content: string;
          p_group_ids: string[];
        };
        Returns: Post;
      };
      add_shares_to_post: {
        Args: { p_post_id: string; p_group_ids: string[] };
        Returns: undefined;
      };
    };
  };
};

// 피드/상세 화면에서 join한 형태로 자주 쓰는 뷰 모델.
// Supabase의 임베디드 select(`*, profiles(...)`) 타입 추론이 Relationships 메타데이터 없이는
// 부정확해서(TS §PLAN-I-4), join 결과는 아래 타입으로 명시 캐스팅해서 쓴다.
export type PostWithProfile = Post & {
  profiles: Pick<Profile, 'nickname' | 'avatar_url'>;
};

export type PostWithAuthor = PostWithProfile & {
  comment_count: number;
  amen_count: number;
  amened_by_me: boolean;
};

export type CommentWithAuthor = Comment & {
  profiles: Pick<Profile, 'nickname' | 'avatar_url'>;
};

export type GroupMembership = {
  group_id: string;
  groups: Pick<Group, 'id' | 'name' | 'invite_code'>;
};
