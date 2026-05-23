import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/services/api';

interface ChatRoom {
  id: string;
  type: string; // 'DONATION' ou 'FREIGHT'
  status: string;
  item: {
    id: string;
    title: string;
    imageUrls: string[];
  };
  otherUser: {
    id: string;
    fullName: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    readAt: string | null;
    senderId: string;
  } | null;
}

export default function ChatListScreen() {
  const router = useRouter();

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });

  const { data: chats, isLoading, isError } = useQuery<ChatRoom[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      const response = await api.get('/chats');
      return response.data;
    },
    refetchInterval: 5000 
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#EB681E" /></View>;
  }

  if (isError) {
    return <View style={styles.center}><Text style={styles.errorText}>Erro ao carregar conversas.</Text></View>;
  }

  return (
    <View style={styles.container}>
      
      {/* HEADER PADRONIZADO */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensagens</Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Você ainda não possui conversas.</Text>
            <Text style={styles.emptySubText}>Suas negociações aparecerão aqui.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMyLastMessage = item.lastMessage?.senderId === me?.id;
          const isUnread = item.lastMessage && !isMyLastMessage && !item.lastMessage.readAt;
          
          // IDENTIFICADOR DE FRETE
          const isFreight = item.type === 'FREIGHT';

          return (
            <TouchableOpacity 
              style={[styles.chatCard, isFreight && styles.chatCardFreight]} 
              activeOpacity={0.7}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <View style={styles.avatarContainer}>
                <Image 
                  source={{ uri: item.item.imageUrls?.[0] || 'https://via.placeholder.com/150' }} 
                  style={[styles.avatar, isFreight && styles.avatarFreight]} 
                />
                {isUnread && <View style={styles.unreadBadge} />}
              </View>
              
              <View style={styles.chatInfo}>
                <View style={styles.chatHeaderRow}>
                  <Text style={[styles.userName, isUnread && styles.textBold, isFreight && {color: '#1F2937'}]} numberOfLines={1}>
                    {isFreight ? '🚚 ' : ''}{item.otherUser.fullName}
                  </Text>
                  {item.lastMessage && (
                    <Text style={[styles.timeText, isUnread && styles.timeTextUnread]}>
                      {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
                
                <Text style={[styles.itemTitle, isFreight && { color: '#F59E0B' }]} numberOfLines={1}>
                  {isFreight ? '📦 Transporte: ' : '📦 '}{item.item.title}
                </Text>
                
                <Text style={[styles.lastMessage, isUnread && styles.textBold]} numberOfLines={1}>
                  {isMyLastMessage && <Text style={styles.youPrefix}>Você: </Text>}
                  {item.lastMessage ? item.lastMessage.content : 'Nenhuma mensagem ainda...'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#DC2626', fontSize: 16, fontWeight: 'bold' },
  
  // Header com Padding ajustado (Idêntico ao app)
  header: { 
    padding: 24, 
    borderBottomWidth: 1, 
    borderColor: '#E2E8F0', 
    backgroundColor: '#FFFFFF', 
    paddingTop: Platform.OS === 'ios' ? 60 : 40 
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#0F172A' },
  
  listContent: { padding: 20 },
  
  // Card Premium Padronizado
  chatCard: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    elevation: 2, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  chatCardFreight: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }, 
  
  avatarContainer: { position: 'relative', marginRight: 16 },
  avatar: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#E2E8F0' },
  avatarFreight: { borderWidth: 2, borderColor: '#F59E0B' }, 
  
  // Badge Laranja para mensagens novas
  unreadBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EB681E', borderWidth: 2, borderColor: '#FFF' },
  
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 16, color: '#334155', flex: 1, marginRight: 10, fontWeight: '600' },
  timeText: { fontSize: 12, color: '#94A3B8' },
  timeTextUnread: { color: '#EB681E', fontWeight: 'bold' },
  
  itemTitle: { fontSize: 13, color: '#EB681E', fontWeight: 'bold', marginBottom: 4 },
  
  lastMessage: { fontSize: 14, color: '#64748B' },
  youPrefix: { color: '#94A3B8', fontWeight: 'normal' }, 
  
  textBold: { fontWeight: 'bold', color: '#0F172A' }, 

  emptyContainer: { alignItems: 'center', marginTop: 100, padding: 20 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginBottom: 8 },
  emptySubText: { fontSize: 15, color: '#94A3B8', textAlign: 'center' }
});