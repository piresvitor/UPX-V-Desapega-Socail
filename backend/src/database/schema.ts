import { 
  pgTable, 
  uuid, 
  text, 
  varchar, 
  timestamp, 
  boolean, 
  decimal, 
  pgEnum 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['Doador', 'Beneficiário', 'Freteiro', 'Admin']);
export const itemStatusEnum = pgEnum('item_status', ['Disponível', 'Reservado', 'Doado', 'Cancelado']);
export const freightStatusEnum = pgEnum('freight_status', ['Pendente', 'Aceito', 'Em Trânsito', 'Finalizado']);

// ENUMS PARA O CHAT
export const chatRoomTypeEnum = pgEnum('chat_room_type', ['DONATION', 'FREIGHT']);
export const chatRoomStatusEnum = pgEnum('chat_room_status', ['Ativo', 'Arquivado']);

// --- TABELAS ---

// 1. Usuários
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  email: varchar('email', { length: 150 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').default('Beneficiário').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  fcmToken: text('fcm_token'),
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
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// 3. Salas de Chat (Atualizada com type e status)
export const chatRooms = pgTable('chat_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => items.id).notNull(),
  participant1: uuid('participant_1').references(() => users.id).notNull(),
  participant2: uuid('participant_2').references(() => users.id).notNull(),
  type: chatRoomTypeEnum('type').default('DONATION').notNull(),
  status: chatRoomStatusEnum('status').default('Ativo').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// 4. Mensagens
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => chatRooms.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Solicitações de Frete
export const freightRequests = pgTable('freight_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => items.id).notNull(),
  beneficiaryId: uuid('beneficiary_id').references(() => users.id).notNull(),
  freighterId: uuid('freighter_id').references(() => users.id),
  estimatedPrice: decimal('estimated_price', { precision: 10, scale: 2 }),
  status: freightStatusEnum('status').default('Pendente').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- RELACIONAMENTOS (DRIZZLE ORM) ---

export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  // Um usuário pode estar em várias salas de chat e enviar várias mensagens
  chatRoomsAsParticipant1: many(chatRooms, { relationName: 'participant1' }),
  chatRoomsAsParticipant2: many(chatRooms, { relationName: 'participant2' }),
  messages: many(messages),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  donor: one(users, {
    fields: [items.donorId], 
    references: [users.id],  
  }),
  chatRooms: many(chatRooms), // Um item pode ter várias negociações de chat abertas
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
  messages: many(messages), // Uma sala tem muitas mensagens
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