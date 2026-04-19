import { 
  pgTable, 
  uuid, 
  text, 
  varchar, 
  timestamp, 
  boolean, 
  decimal, 
  pgEnum,
  geometry,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// --- ENUMS ---
// ============================================================================
export const userRoleEnum = pgEnum('user_role', ['Doador', 'Beneficiário', 'Freteiro', 'Admin']);
export const itemStatusEnum = pgEnum('item_status', ['Disponível', 'Reservado', 'Doado', 'Cancelado']);
export const freightStatusEnum = pgEnum('freight_status', ['Pendente', 'Aceito', 'Em Trânsito', 'Finalizado']);
export const chatRoomTypeEnum = pgEnum('chat_room_type', ['DONATION', 'FREIGHT']);
export const chatRoomStatusEnum = pgEnum('chat_room_status', ['Ativo', 'Arquivado']);

// ============================================================================
// --- TABELAS ---
// ============================================================================

// 1. Usuários
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  email: varchar('email', { length: 150 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('Beneficiário').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  fcmToken: text('fcm_token'),
  
  // --- SISTEMA DE REPUTAÇÃO ---
  ratingAverage: decimal('rating_average', { precision: 3, scale: 2 }).default('0.00').notNull(), 
  ratingCount: decimal('rating_count', { precision: 10, scale: 0 }).default('0').notNull(), 
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// 2. Itens para Doação
export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  donorId: uuid('donor_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  status: itemStatusEnum('status').default('Disponível').notNull(),
  imageUrls: text('image_urls').array(), 
  location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  locationIdx: index('location_idx').using('gist', table.location),
  donorIdIdx: index('donor_id_idx').on(table.donorId),
}));

// 3. Salas de Chat
export const chatRooms = pgTable('chat_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => items.id).notNull(),
  participant1: uuid('participant_1').references(() => users.id).notNull(),
  participant2: uuid('participant_2').references(() => users.id).notNull(),
  type: chatRoomTypeEnum('type').default('DONATION').notNull(),
  status: chatRoomStatusEnum('status').default('Ativo').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  itemIdIdx: index('chat_rooms_item_id_idx').on(table.itemId),
  participant1Idx: index('chat_rooms_p1_idx').on(table.participant1),
  participant2Idx: index('chat_rooms_p2_idx').on(table.participant2),
}));

// 4. Mensagens
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => chatRooms.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  roomIdIdx: index('messages_room_id_idx').on(table.roomId),
  senderIdIdx: index('messages_sender_id_idx').on(table.senderId),
}));

// 5. Solicitações de Frete
export const freightRequests = pgTable('freight_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => items.id).notNull(),
  beneficiaryId: uuid('beneficiary_id').references(() => users.id).notNull(),
  freighterId: uuid('freighter_id').references(() => users.id),
  estimatedPrice: decimal('estimated_price', { precision: 10, scale: 2 }),
  status: freightStatusEnum('status').default('Pendente').notNull(),
  destinationLocation: geometry('destination_location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  itemIdIdx: index('freight_item_id_idx').on(table.itemId),
  beneficiaryIdIdx: index('freight_beneficiary_id_idx').on(table.beneficiaryId),
  freighterIdIdx: index('freight_freighter_id_idx').on(table.freighterId),
}));

// 6. Solicitações de Verificação (LGPD + OCR)
export const verificationRequests = pgTable('verification_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(), 
  encryptedCpf: text('encrypted_cpf').notNull(),
  identityDocumentUrl: text('identity_document_url').notNull(), 
  incomeProofUrl: text('income_proof_url').notNull(),           
  extractedIncome: text('extracted_income'), 
  ocrConfidence: text('ocr_confidence'),     
  status: text('status', { 
    enum: [
      'Processando_IA',   
      'Aprovado_Auto',    
      'Analise_Manual',   
      'Aprovado_Admin',   
      'Rejeitado'         
    ] 
  }).default('Processando_IA').notNull(),
  adminMessage: text('admin_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 7. Avaliações (Sistema de Reputação)
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewerId: uuid('reviewer_id').references(() => users.id).notNull(),
  revieweeId: uuid('reviewee_id').references(() => users.id).notNull(),
  itemId: uuid('item_id').references(() => items.id), 
  rating: decimal('rating', { precision: 2, scale: 1 }).notNull(), 
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  reviewerIdIdx: index('reviews_reviewer_id_idx').on(table.reviewerId),
  revieweeIdIdx: index('reviews_reviewee_id_idx').on(table.revieweeId),
  itemIdIdx: index('reviews_item_id_idx').on(table.itemId),
  uniqueReviewIdx: uniqueIndex('unique_review_idx').on(table.reviewerId, table.revieweeId, table.itemId),
}));


// ============================================================================
// --- RELACIONAMENTOS (DRIZZLE ORM) ---
// ============================================================================

export const usersRelations = relations(users, ({ many, one }) => ({
  items: many(items),
  chatRoomsAsParticipant1: many(chatRooms, { relationName: 'participant1' }),
  chatRoomsAsParticipant2: many(chatRooms, { relationName: 'participant2' }),
  messages: many(messages),
  reviewsGiven: many(reviews, { relationName: 'reviewer' }),
  reviewsReceived: many(reviews, { relationName: 'reviewee' }),
  verificationRequest: one(verificationRequests, {
    fields: [users.id],
    references: [verificationRequests.userId],
  }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  donor: one(users, {
    fields: [items.donorId], 
    references: [users.id],  
  }),
  chatRooms: many(chatRooms),
  reviews: many(reviews),
}));

export const chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
  item: one(items, {
    fields: [chatRooms.itemId],
    references: [items.id],
  }),
  user1: one(users, {
    fields: [chatRooms.participant1],
    references: [users.id],
    relationName: 'participant1',
  }),
  user2: one(users, {
    fields: [chatRooms.participant2],
    references: [users.id],
    relationName: 'participant2',
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  room: one(chatRooms, {
    fields: [messages.roomId],
    references: [chatRooms.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: 'reviewer',
  }),
  reviewee: one(users, {
    fields: [reviews.revieweeId],
    references: [users.id],
    relationName: 'reviewee',
  }),
  item: one(items, {
    fields: [reviews.itemId],
    references: [items.id],
  }),
}));