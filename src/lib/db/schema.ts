import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Hermetic database schema.
 *
 * Design principles:
 *  - Server stores ciphertext metadata + opaque hashes. Never plaintext keys,
 *    passwords, or content.
 *  - Email addresses are stored as 32-byte SHA-256 hashes (no plaintext).
 *  - Foreign-key cascades wipe related rows on parent deletion so account
 *    deletion fully clears the user's footprint.
 */

// Postgres `bytea` for fixed-size binary blobs (e.g. SHA-256 hashes).
const bytea = customType<{ data: Uint8Array; default: false }>({
  dataType() {
    return "bytea";
  },
});

// ---------------------------------------------------------------------------
// users — magic-link accounts. Required for Switch (dead-man's switch).
// Drops and Capsules currently work without an account.
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailHash: bytea("email_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [index("users_email_hash_idx").on(t.emailHash)],
);

// ---------------------------------------------------------------------------
// auth_tokens — magic-link tokens. Stored as hashes; the plaintext token
// only exists in the link emailed to the user.
// ---------------------------------------------------------------------------
export const authTokenKind = pgEnum("auth_token_kind", ["magic_link"]);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: bytea("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: authTokenKind("kind").notNull().default("magic_link"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("auth_tokens_token_hash_idx").on(t.tokenHash)],
);

// ---------------------------------------------------------------------------
// drops — Drop-mode metadata. Optional: server stores nothing for purely
// fragment-based drops; rows here exist only when burn-after-reading,
// view limits, or expiry are requested.
// ---------------------------------------------------------------------------
export const drops = pgTable("drops", {
  id: uuid("id").primaryKey().defaultRandom(),
  cid: text("cid").notNull().unique(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  // null = unlimited, n = burn after n views
  viewLimit: integer("view_limit"),
  viewCount: integer("view_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  burnedAt: timestamp("burned_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// capsules — Capsule-mode metadata. The drand round + chain hash let us
// (re)derive the unlock parameters; the CID points to the tlock-encrypted
// blob on IPFS.
// ---------------------------------------------------------------------------
export const capsules = pgTable("capsules", {
  id: uuid("id").primaryKey().defaultRandom(),
  cid: text("cid").notNull(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  unlockAt: timestamp("unlock_at", { withTimezone: true }).notNull(),
  drandRound: bigint("drand_round", { mode: "number" }).notNull(),
  drandChainHash: text("drand_chain_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// switches — Dead-man's switch. Owner pings to keep alive; if the deadline
// passes, status becomes "triggered" and trustees are notified.
//
// Shares are NOT stored here — they are emailed to trustees at creation time.
// The server holds nothing that lets it reconstruct the key.
// ---------------------------------------------------------------------------
export const switchStatus = pgEnum("switch_status", [
  "active",
  "triggered",
  "revoked",
]);

export const switches = pgTable("switches", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  cid: text("cid").notNull(),
  thresholdK: integer("threshold_k").notNull(),
  shareCountN: integer("share_count_n").notNull(),
  // How long without a check-in before the switch triggers (in seconds).
  inactivitySeconds: integer("inactivity_seconds").notNull(),
  lastCheckinAt: timestamp("last_checkin_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: switchStatus("status").notNull().default("active"),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }),
  trusteesNotifiedAt: timestamp("trustees_notified_at", { withTimezone: true }),
  // True once first warning email has been sent.
  warningSent: boolean("warning_sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// switch_trustees — one row per trustee on a switch.
//
// Trustee email is stored as PLAINTEXT (alongside a SHA-256 hash used only
// for owner-side lookup). This is a deliberate trade-off versus the rest of
// the system: the server cannot read content or reconstruct keys, but it
// CAN see who the trustees are. We keep plaintext so the trigger-time
// notification can actually deliver — hashing would break that flow.
//
// The share itself is NEVER stored — it is emailed to the trustee at
// creation time and lives only in their inbox / password manager. So while
// trustee identities are visible to the operator, no row in this table
// (alone or combined) lets the server reconstruct the symmetric key.
//
// See `docs/threat-model.md` ("Metadata") for the full rationale.
// ---------------------------------------------------------------------------
export const switchTrustees = pgTable(
  "switch_trustees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    switchId: uuid("switch_id")
      .notNull()
      .references(() => switches.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    emailHash: bytea("email_hash").notNull(),
    shareIndex: integer("share_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("switch_trustees_switch_idx").on(t.switchId),
    index("switch_trustees_email_idx").on(t.emailHash),
  ],
);

// Drizzle SQL helper to reference NOW() at insert/update time when needed.
export const NOW = sql`now()`;

// ---------------------------------------------------------------------------
// echoes — Echo-mode metadata (sealed-bid auctions).
// ---------------------------------------------------------------------------
export const echoes = pgTable("echoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  drandRound: bigint("drand_round", { mode: "number" }).notNull(),
  drandChainHash: text("drand_chain_hash").notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const echoBids = pgTable(
  "echo_bids",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    echoId: uuid("echo_id")
      .notNull()
      .references(() => echoes.id, { onDelete: "cascade" }),
    cid: text("cid").notNull(),
    bidderName: text("bidder_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("echo_bids_echo_idx").on(t.echoId)],
);

// ---------------------------------------------------------------------------
// mirrors — 2-of-2 mutual reveal. Both halves must combine to unlock.
// Holder emails stored as SHA-256 hashes only. Shares are NEVER persisted.
// ---------------------------------------------------------------------------
export const mirrorStatus = pgEnum("mirror_status", ["active", "revoked"]);

export const mirrors = pgTable("mirrors", {
  id: uuid("id").primaryKey().defaultRandom(),
  cid: text("cid").notNull(),
  holderAEmailHash: bytea("holder_a_email_hash").notNull(),
  holderBEmailHash: bytea("holder_b_email_hash").notNull(),
  status: mirrorStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
