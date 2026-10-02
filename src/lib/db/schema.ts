import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

/* ───────────────────────── Admin & security ───────────────────────── */

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('admin_users_email_key').on(t.email), check('admin_users_email_lowercase', sql`${t.email} = lower(${t.email})`)],
);

export const trustedDevices = pgTable(
  'trusted_devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: createdAt(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('trusted_devices_token_hash_key').on(t.tokenHash), index('trusted_devices_user_idx').on(t.userId)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    /** Previous token hash, accepted for a short grace period after rotation. */
    prevTokenHash: text('prev_token_hash'),
    tokenRotatedAt: timestamp('token_rotated_at', { withTimezone: true }).notNull().defaultNow(),
    remember: boolean('remember').notNull().default(false),
    trustedDeviceId: uuid('trusted_device_id').references(() => trustedDevices.id, { onDelete: 'set null' }),
    deviceType: text('device_type').notNull(),
    deviceName: text('device_name').notNull(),
    browser: text('browser').notNull(),
    os: text('os').notNull(),
    /** Browser family + OS family; a change mid-session is treated as suspicious. */
    clientFingerprint: text('client_fingerprint').notNull(),
    ip: text('ip'),
    country: text('country'),
    region: text('region'),
    city: text('city'),
    createdAt: createdAt(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    idleExpiresAt: timestamp('idle_expires_at', { withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp('absolute_expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: text('revoked_reason'),
  },
  (t) => [
    uniqueIndex('sessions_token_hash_key').on(t.tokenHash),
    index('sessions_prev_token_hash_idx').on(t.prevTokenHash),
    index('sessions_user_idx').on(t.userId, t.revokedAt),
    check(
      'sessions_revoked_reason_valid',
      sql`${t.revokedReason} is null or ${t.revokedReason} in ('logout','terminated','terminated_all','password_changed','password_reset','suspicious','expired')`,
    ),
  ],
);

export const loginChallenges = pgTable(
  'login_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    codeHash: text('code_hash').notNull(),
    remember: boolean('remember').notNull().default(false),
    attempts: smallint('attempts').notNull().default(0),
    sendCount: smallint('send_count').notNull().default(1),
    lastSentAt: timestamp('last_sent_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('login_challenges_token_hash_key').on(t.tokenHash),
    check('login_challenges_attempts_range', sql`${t.attempts} >= 0 and ${t.attempts} <= 20`),
  ],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('password_reset_tokens_token_hash_key').on(t.tokenHash), index('password_reset_tokens_user_idx').on(t.userId)],
);

export const SECURITY_EVENT_TYPES = [
  'login_success',
  'login_failed',
  'login_new_device',
  'verification_sent',
  'verification_failed',
  'verification_success',
  'logout',
  'session_terminated',
  'sessions_terminated_all',
  'session_suspicious',
  'password_changed',
  'password_reset_requested',
  'password_reset_completed',
  'email_changed',
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export const securityEvents = pgTable(
  'security_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    type: text('type').$type<SecurityEventType>().notNull(),
    deviceSummary: text('device_summary'),
    ip: text('ip'),
    country: text('country'),
    createdAt: createdAt(),
  },
  (t) => [
    index('security_events_user_created_idx').on(t.userId, t.createdAt),
    check('security_events_type_valid', sql.raw(`type in (${SECURITY_EVENT_TYPES.map((v) => `'${v}'`).join(',')})`)),
  ],
);

export const activityLog = pgTable(
  'activity_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    /** Short Dutch description shown to the owner, e.g. "Foto vervangen". */
    summary: text('summary').notNull(),
    area: text('area').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('activity_log_created_idx').on(t.createdAt)],
);

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
});

/* ───────────────────────── Media ───────────────────────── */

export const images = pgTable(
  'images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Random directory name for the generated files. Never shown to the owner. */
    storageKey: text('storage_key').notNull(),
    title: text('title').notNull().default(''),
    altText: text('alt_text').notNull().default(''),
    caption: text('caption').notNull().default(''),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    /** Widths (px) of generated WebP variants, ascending. */
    variantWidths: integer('variant_widths').array().notNull(),
    placeholder: text('placeholder').notNull().default(''),
    bytes: integer('bytes').notNull(),
    isVisible: boolean('is_visible').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('images_storage_key_key').on(t.storageKey),
    index('images_gallery_idx').on(t.deletedAt, t.isVisible, t.sortOrder),
    check('images_dimensions_positive', sql`${t.width} > 0 and ${t.height} > 0`),
    check('images_title_length', sql`char_length(${t.title}) <= 120`),
    check('images_alt_length', sql`char_length(${t.altText}) <= 300`),
    check('images_caption_length', sql`char_length(${t.caption}) <= 300`),
  ],
);

/* ───────────────────────── Website content ───────────────────────── */

export const siteSettings = pgTable(
  'site_settings',
  {
    id: smallint('id').primaryKey().default(1),
    businessName: text('business_name').notNull(),
    tagline: text('tagline').notNull(),
    phoneDisplay: text('phone_display').notNull(),
    phoneE164: text('phone_e164').notNull(),
    email: text('email').notNull(),
    street: text('street').notNull().default(''),
    postalCode: text('postal_code').notNull().default(''),
    city: text('city').notNull(),
    foundedYear: smallint('founded_year'),
    facebookUrl: text('facebook_url').notNull().default(''),
    instagramUrl: text('instagram_url').notNull().default(''),

    heroTitle: text('hero_title').notNull(),
    heroText: text('hero_text').notNull(),
    heroImageId: uuid('hero_image_id').references((): AnyPgColumn => images.id, { onDelete: 'set null' }),
    introTitle: text('intro_title').notNull(),
    introText: text('intro_text').notNull(),
    aboutTitle: text('about_title').notNull(),
    aboutText: text('about_text').notNull(),
    aboutStory: text('about_story').notNull(),
    aboutImageId: uuid('about_image_id').references((): AnyPgColumn => images.id, { onDelete: 'set null' }),
    waitingAreaText: text('waiting_area_text').notNull(),
    reservationText: text('reservation_text').notNull(),
    allergenText: text('allergen_text').notNull(),
    footerText: text('footer_text').notNull(),
    showGalleryOnHome: boolean('show_gallery_on_home').notNull().default(true),
    showFeaturedMenuOnHome: boolean('show_featured_menu_on_home').notNull().default(true),

    /** Optional PDF version of the menu (random file key, never shown). */
    menuPdfKey: text('menu_pdf_key'),
    menuPdfBytes: integer('menu_pdf_bytes'),
    menuPdfUpdatedAt: timestamp('menu_pdf_updated_at', { withTimezone: true }),

    newDeviceAlerts: boolean('new_device_alerts').notNull().default(true),
    messageAlerts: boolean('message_alerts').notNull().default(true),
    updatedAt: updatedAt(),
  },
  (t) => [check('site_settings_singleton', sql`${t.id} = 1`)],
);

export const PAGE_KEYS = ['home', 'menukaart', 'over-ons', 'galerij', 'contact', 'privacy', 'voorwaarden'] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export const pageSeo = pgTable(
  'page_seo',
  {
    pageKey: text('page_key').$type<PageKey>().primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('page_seo_key_valid', sql.raw(`page_key in (${PAGE_KEYS.map((v) => `'${v}'`).join(',')})`)),
    check('page_seo_title_length', sql`char_length(${t.title}) between 1 and 120`),
    check('page_seo_description_length', sql`char_length(${t.description}) between 1 and 320`),
  ],
);

export const HIGHLIGHT_ICONS = ['seat', 'pizza', 'clock', 'grill', 'heart', 'bag'] as const;
export type HighlightIcon = (typeof HIGHLIGHT_ICONS)[number];

export const highlights = pgTable(
  'highlights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    icon: text('icon').$type<HighlightIcon>().notNull().default('heart'),
    sortOrder: integer('sort_order').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [check('highlights_icon_valid', sql.raw(`icon in (${HIGHLIGHT_ICONS.map((v) => `'${v}'`).join(',')})`))],
);

/* ───────────────────────── Menu ───────────────────────── */

export const menuCategories = pgTable(
  'menu_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('menu_categories_slug_key').on(t.slug),
    check('menu_categories_name_length', sql`char_length(${t.name}) between 1 and 80`),
    check('menu_categories_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
);

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => menuCategories.id, { onDelete: 'cascade' }),
    number: text('number').notNull().default(''),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    /** Price in euro cents. Null when only variants have a price (or price on request). */
    priceCents: integer('price_cents'),
    allergens: text('allergens').notNull().default(''),
    imageId: uuid('image_id').references(() => images.id, { onDelete: 'set null' }),
    isVisible: boolean('is_visible').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('menu_items_category_idx').on(t.categoryId, t.sortOrder),
    index('menu_items_image_idx').on(t.imageId),
    check('menu_items_name_length', sql`char_length(${t.name}) between 1 and 120`),
    check('menu_items_price_range', sql`${t.priceCents} is null or (${t.priceCents} >= 0 and ${t.priceCents} <= 100000)`),
  ],
);

export const menuItemVariants = pgTable(
  'menu_item_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    priceCents: integer('price_cents').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('menu_item_variants_item_idx').on(t.itemId),
    check('menu_item_variants_label_length', sql`char_length(${t.label}) between 1 and 40`),
    check('menu_item_variants_price_range', sql`${t.priceCents} >= 0 and ${t.priceCents} <= 100000`),
  ],
);

/* ───────────────────────── Opening hours ───────────────────────── */

/** ISO weekday: 1 = maandag … 7 = zondag. */
export const openingDays = pgTable(
  'opening_days',
  {
    weekday: smallint('weekday').primaryKey(),
    note: text('note').notNull().default(''),
  },
  (t) => [check('opening_days_weekday_range', sql`${t.weekday} between 1 and 7`)],
);

export const openingPeriods = pgTable(
  'opening_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    weekday: smallint('weekday')
      .notNull()
      .references(() => openingDays.weekday, { onDelete: 'cascade' }),
    opensAt: time('opens_at').notNull(),
    closesAt: time('closes_at').notNull(),
  },
  (t) => [index('opening_periods_weekday_idx').on(t.weekday), check('opening_periods_order', sql`${t.closesAt} > ${t.opensAt}`)],
);

export const openingExceptions = pgTable(
  'opening_exceptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
    isClosed: boolean('is_closed').notNull(),
    label: text('label').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('opening_exceptions_range_idx').on(t.startsOn, t.endsOn),
    check('opening_exceptions_range_order', sql`${t.endsOn} >= ${t.startsOn}`),
    check('opening_exceptions_label_length', sql`char_length(${t.label}) between 1 and 80`),
    // A no-overlap EXCLUDE constraint is added in a custom migration.
  ],
);

export const openingExceptionPeriods = pgTable(
  'opening_exception_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    exceptionId: uuid('exception_id')
      .notNull()
      .references(() => openingExceptions.id, { onDelete: 'cascade' }),
    opensAt: time('opens_at').notNull(),
    closesAt: time('closes_at').notNull(),
  },
  (t) => [index('opening_exception_periods_exception_idx').on(t.exceptionId), check('opening_exception_periods_order', sql`${t.closesAt} > ${t.opensAt}`)],
);

/* ───────────────────────── Messages ───────────────────────── */

export const MESSAGE_STATUSES = ['new', 'read', 'replied', 'archived'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    status: text('status').$type<MessageStatus>().notNull().default('new'),
    createdAt: createdAt(),
    readAt: timestamp('read_at', { withTimezone: true }),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
  },
  (t) => [
    index('messages_status_created_idx').on(t.status, t.createdAt),
    check('messages_status_valid', sql.raw(`status in (${MESSAGE_STATUSES.map((v) => `'${v}'`).join(',')})`)),
    check('messages_body_length', sql`char_length(${t.body}) between 1 and 5000`),
    check('messages_name_length', sql`char_length(${t.name}) between 1 and 100`),
    check('messages_subject_length', sql`char_length(${t.subject}) between 1 and 150`),
  ],
);

export const messageReplies = pgTable(
  'message_replies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('message_replies_message_idx').on(t.messageId), check('message_replies_body_length', sql`char_length(${t.body}) between 1 and 10000`)],
);

/* ───────────────────────── Offers ───────────────────────── */

export const offers = pgTable(
  'offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    priceText: text('price_text').notNull().default(''),
    imageId: uuid('image_id').references(() => images.id, { onDelete: 'set null' }),
    startsOn: date('starts_on'),
    endsOn: date('ends_on'),
    isVisible: boolean('is_visible').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('offers_image_idx').on(t.imageId),
    check('offers_title_length', sql`char_length(${t.title}) between 1 and 120`),
    check('offers_date_order', sql`${t.startsOn} is null or ${t.endsOn} is null or ${t.endsOn} >= ${t.startsOn}`),
  ],
);
