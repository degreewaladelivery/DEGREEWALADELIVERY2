export interface HomeBanner {
  /** Null when nobody has uploaded one; callers fall back to the bundled art. */
  imageUrl: string | null;
  /** The tall illustration on the wide-screen website. Web only — the app has
   *  no equivalent slot. */
  desktopHeroUrl: string | null;
  /** Category the call-to-action opens, by id, or null to leave it inert. */
  ctaCategoryId: string | null;
  isActive: boolean;
}

/** The slice of supabase-js this needs, so neither platform's client type has
 *  to be imported here — matching how the other shared queries are typed. */
interface Db {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * The home hero, as configured by an admin.
 *
 * Returns null rather than throwing when the row is missing or unreadable: the
 * banner is decoration, and a home page that fails to load because a picture
 * could not be resolved would be a far worse outcome than one showing the
 * picture it shipped with.
 */
export async function fetchHomeBanner(db: Db): Promise<HomeBanner | null> {
  try {
    const { data } = await db
      .from('home_banner')
      .select('image_url, desktop_hero_url, cta_category_id, is_active')
      .single();
    if (!data) return null;
    return {
      imageUrl: (data.image_url as string | null) ?? null,
      desktopHeroUrl: (data.desktop_hero_url as string | null) ?? null,
      ctaCategoryId: (data.cta_category_id as string | null) ?? null,
      isActive: data.is_active !== false,
    };
  } catch {
    return null;
  }
}
