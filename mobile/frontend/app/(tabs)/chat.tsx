import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
  }

  if (isError) {
    return <View style={styles.center}><Text style={styles.errorText}>Erro ao carregar conversas.</Text></View>;
  }

  return (
    <View style={styles.container}>
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
          
          // IDENTIFICADOR DE FRETE: Se for frete, destacamos com laranja
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
                  <Text style={[styles.userName, isUnread && styles.textBold, isFreight && {color: '#E65100'}]} numberOfLines={1}>
                    {isFreight ? '🚚 ' : ''}{item.otherUser.fullName}
                  </Text>
                  {item.lastMessage && (
                    <Text style={[styles.timeText, isUnread && styles.timeTextUnread]}>
                      {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
                
                <Text style={[styles.itemTitle, isFreight && { color: '#FF9800' }]} numberOfLines={1}>
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#DC2626', fontSize: 16 },
  
  header: { padding: 30, paddingTop: 60, borderBottomWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  
  listContent: { padding: 20 },
  
  chatCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 12, elevation: 2, alignItems: 'center' },
  chatCardFreight: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FF9800' }, 
  
  avatarContainer: { position: 'relative', marginRight: 15 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E5E7EB' },
  avatarFreight: { borderWidth: 2, borderColor: '#FF9800' }, 
  unreadBadge: { position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#2196F3', borderWidth: 2, borderColor: '#FFF' },
  
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  userName: { fontSize: 16, color: '#1F2937', flex: 1, marginRight: 10 },
  timeText: { fontSize: 12, color: '#6B7280' },
  timeTextUnread: { color: '#2196F3', fontWeight: 'bold' },
  
  itemTitle: { fontSize: 13, color: '#2196F3', fontWeight: '600', marginBottom: 4 },
  
  lastMessage: { fontSize: 14, color: '#6B7280' },
  youPrefix: { color: '#9CA3AF', fontWeight: 'normal' }, 
  
  textBold: { fontWeight: 'bold', color: '#111827' }, 

  emptyContainer: { alignItems: 'center', marginTop: 100, padding: 20 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#6B7280', textAlign: 'center' }
});