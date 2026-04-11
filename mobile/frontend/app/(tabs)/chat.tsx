// app/(tabs)/chat.tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/services/api';

// Tipagem atualizada
interface ChatRoom {
  id: string;
  type: string;
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
    senderId: string; // <-- Precisamos saber quem enviou a última msg
  } | null;
}

export default function ChatListScreen() {
  const router = useRouter();

  // 1. Precisamos saber quem somos nós para o prefixo "Você:"
  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });

  // 2. Busca a lista de conversas
  const { data: chats, isLoading, isError } = useQuery<ChatRoom[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      const response = await api.get('/chats');
      return response.data;
    },
    refetchInterval: 5000 // Atualiza a cada 5 segundos para a "bolinha azul" aparecer rápido
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
          // --- LÓGICA DE VISUALIZAÇÃO ---
          const isMyLastMessage = item.lastMessage?.senderId === me?.id;
          
          // É não lida se: existe uma msg + não fui eu que mandei + readAt está vazio (null)
          const isUnread = item.lastMessage && !isMyLastMessage && !item.lastMessage.readAt;

          return (
            <TouchableOpacity 
              style={styles.chatCard} 
              activeOpacity={0.7}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <View style={styles.avatarContainer}>
                <Image 
                  source={{ uri: item.item.imageUrls?.[0] || 'https://via.placeholder.com/150' }} 
                  style={styles.avatar} 
                />
                {/* A Bolinha Azul de Não Lida em cima da foto */}
                {isUnread && <View style={styles.unreadBadge} />}
              </View>
              
              <View style={styles.chatInfo}>
                <View style={styles.chatHeaderRow}>
                  <Text style={[styles.userName, isUnread && styles.textBold]} numberOfLines={1}>
                    {item.otherUser.fullName}
                  </Text>
                  {item.lastMessage && (
                    <Text style={[styles.timeText, isUnread && styles.timeTextUnread]}>
                      {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
                
                <Text style={styles.itemTitle} numberOfLines={1}>
                  📦 {item.item.title}
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
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16 },
  
  header: { padding: 20, paddingTop: 40, borderBottomWidth: 1, borderColor: '#F0F0F0', backgroundColor: '#FFF' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  
  listContent: { padding: 10 },
  
  chatCard: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#F0F0F0', alignItems: 'center' },
  
  // Container do Avatar para posicionar a bolinha azul
  avatarContainer: { position: 'relative', marginRight: 15 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E0E0E0' },
  unreadBadge: { position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#2196F3', borderWidth: 2, borderColor: '#FFF' },
  
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  userName: { fontSize: 16, color: '#111827', flex: 1, marginRight: 10 }, // Removido o fontWeight fixo para reagir ao isUnread
  timeText: { fontSize: 12, color: '#6B7280' },
  timeTextUnread: { color: '#2196F3', fontWeight: 'bold' },
  
  itemTitle: { fontSize: 13, color: '#2196F3', fontWeight: '600', marginBottom: 4 },
  
  lastMessage: { fontSize: 14, color: '#6B7280' },
  youPrefix: { color: '#9CA3AF', fontWeight: 'normal' }, // "Você:" fica clarinho igual no zap
  
  textBold: { fontWeight: 'bold', color: '#111827' }, // Escurece e engorda o texto se não lido

  emptyContainer: { alignItems: 'center', marginTop: 100, padding: 20 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#6B7280', textAlign: 'center' }
});