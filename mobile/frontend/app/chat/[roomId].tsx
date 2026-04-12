import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../src/services/api';

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient(); 
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });

  const { data: chats } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => (await api.get('/chats')).data,
  });

  const currentChat = chats?.find((c: any) => c.id === roomId);

  const { data: itemDetails } = useQuery({
    queryKey: ['item', currentChat?.item?.id],
    queryFn: async () => (await api.get(`/items/${currentChat?.item?.id}`)).data,
    enabled: !!currentChat?.item?.id, 
  });

  const { data: myReviewForThisItem } = useQuery({
    queryKey: ['review_check', me?.id, currentChat?.otherUser?.id, currentChat?.item?.id],
    queryFn: async () => {
      if (!currentChat?.otherUser?.id) return false;
      const response = await api.get(`/reviews/${currentChat.otherUser.id}`);
      const reviews = response.data;
      
      return reviews.some((r: any) => {
        const isMe = r.reviewer.id === me?.id;
        const isThisItem = r.itemId ? r.itemId === currentChat?.item?.id : true;
        return isMe && isThisItem;
      });
    },
    enabled: !!me?.id && !!currentChat?.otherUser?.id,
  });

  const { isLoading: loadingHistory } = useQuery({
    queryKey: ['chatMessages', roomId],
    queryFn: async () => {
      const response = await api.get(`/chats/${roomId}/messages?page=1&limit=50`);
      setMessages(response.data);
      return response.data;
    },
    enabled: !!roomId,
  });

  useEffect(() => {
    const markMessagesAsRead = async () => {
      try {
        await api.patch(`/chats/${roomId}/read`);
        queryClient.invalidateQueries({ queryKey: ['chats'] });
      } catch (error) {
        console.error('Erro ao marcar mensagens como lidas', error);
      }
    };

    if (roomId) {
      markMessagesAsRead();
    }
  }, [roomId, queryClient]);

  useEffect(() => {
    const connectSocket = async () => {
      const token = await AsyncStorage.getItem('@DesapegaSocial:token');
      const BACKEND_URL = 'http://10.0.2.2:3333'; 

      socketRef.current = io(BACKEND_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        setIsSocketConnected(true);
        socketRef.current?.emit('join_room', { roomId });
      });

      socketRef.current.on('receive_message', (newMessage: Message) => {
        setMessages((prevMessages) => [newMessage, ...prevMessages]);
        
        if (newMessage.senderId !== me?.id) {
             api.patch(`/chats/${roomId}/read`).then(() => {
                 queryClient.invalidateQueries({ queryKey: ['chats'] });
             }).catch(console.error);
        }
      });

      socketRef.current.on('connect_error', (err) => {
        console.warn('Erro de conexão no Socket:', err.message);
        setIsSocketConnected(false);
      });
    };

    if (me?.id) {
       connectSocket();
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId, me?.id, queryClient]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    if (!isSocketConnected) {
      Alert.alert('Aguarde', 'Conectando ao chat...');
      return;
    }

    socketRef.current?.emit('send_message', {
      roomId,
      content: inputText.trim(),
    });

    setInputText('');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = String(item.senderId) === String(me?.id);

    return (
      <View style={[styles.messageWrapper, isMyMessage ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.timeText, isMyMessage ? styles.myTimeText : styles.otherTimeText]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{'< Voltar'}</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          {/* NOVO: Nome agora é um botão clicável que leva ao Perfil Público */}
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => {
              if (currentChat?.otherUser?.id) {
                router.push(`/user/${currentChat.otherUser.id}`);
              }
            }}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {currentChat ? currentChat.otherUser.fullName : 'Carregando...'}
            </Text>
          </TouchableOpacity>
          {currentChat && (
            <Text style={styles.headerSub} numberOfLines={1}>
              📦 {currentChat.item.title}
            </Text>
          )}
        </View>

        <View style={[styles.statusDot, { backgroundColor: isSocketConnected ? '#4CAF50' : '#F44336' }]} />
      </View>

      {/* BANNER DE AVALIAÇÃO */}
      {itemDetails?.status === 'Doado' && currentChat && !myReviewForThisItem && (
        <View style={styles.reviewBanner}>
          <View style={styles.reviewBannerTextContainer}>
            <Text style={styles.reviewBannerTitle}>Doação Concluída! 🎉</Text>
            <Text style={styles.reviewBannerSub}>Como foi negociar com {currentChat.otherUser.fullName}?</Text>
          </View>
          <TouchableOpacity 
            style={styles.reviewBannerBtn}
            onPress={() => router.push({
              pathname: '/review/create' as any,
              params: { 
                revieweeId: currentChat.otherUser.id, 
                revieweeName: currentChat.otherUser.fullName,
                itemId: currentChat.item.id 
              }
            })}
          >
            <Text style={styles.reviewBannerBtnText}>⭐ Avaliar</Text>
          </TouchableOpacity>
        </View>
      )}

      {loadingHistory ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          inverted 
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Digite sua mensagem..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendBtnText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E5DDD5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#DDD', elevation: 2, zIndex: 10 },
  backBtn: { width: 70 },
  backBtnText: { fontSize: 16, color: '#2196F3', fontWeight: 'bold' },
  headerCenter: { flex: 1, alignItems: 'center' },
  // Adicionei um leve sublinhado para o usuário saber que é clicável (opcional)
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textDecorationLine: 'underline' },
  headerSub: { fontSize: 13, color: '#666', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5, alignSelf: 'center', flex: 0 },

  reviewBanner: { flexDirection: 'row', backgroundColor: '#FFF9C4', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderColor: '#FBC02D', elevation: 1 },
  reviewBannerTextContainer: { flex: 1, paddingRight: 10 },
  reviewBannerTitle: { fontSize: 14, fontWeight: 'bold', color: '#F57F17' },
  reviewBannerSub: { fontSize: 12, color: '#777', marginTop: 2 },
  reviewBannerBtn: { backgroundColor: '#F57F17', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  reviewBannerBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  listContent: { padding: 15, gap: 10 },

  messageWrapper: { flexDirection: 'row', marginBottom: 10 },
  messageWrapperRight: { justifyContent: 'flex-end' },
  messageWrapperLeft: { justifyContent: 'flex-start' },
  
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  myBubble: { backgroundColor: '#DCF8C6', borderBottomRightRadius: 4 }, 
  otherBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4 }, 

  messageText: { fontSize: 16, lineHeight: 22 },
  myMessageText: { color: '#303030' },
  otherMessageText: { color: '#303030' },
  
  timeText: { fontSize: 11, alignSelf: 'flex-end', marginTop: 4 },
  myTimeText: { color: '#555' },
  otherTimeText: { color: '#999' },

  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', alignItems: 'flex-end' },
  textInput: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, minHeight: 45, maxHeight: 100, fontSize: 16, color: '#333' },
  sendBtn: { marginLeft: 10, backgroundColor: '#2196F3', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#B0BEC5' },
  sendBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
});