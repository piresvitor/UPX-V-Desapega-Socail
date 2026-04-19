import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api } from '../../src/services/api';

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export default function ChatRoomScreen() {
  const { roomId, autoMsg } = useLocalSearchParams<{ roomId: string, autoMsg?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient(); 
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const hasSentAutoMsg = useRef(false); // Trava para enviar mensagem só 1x

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });

  const { data: chats } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => (await api.get('/chats')).data,
  });

  const currentChat = chats?.find((c: any) => c.id === roomId);
  const isFreightChat = currentChat?.type === 'FREIGHT';

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

  // MUTAÇÃO: SOLICITAR FRETE COM FALLBACK DE GPS
  const requestFreightMutation = useMutation({
    mutationFn: async () => {
      let finalCoords = { lat: -23.5015, lng: -47.4581 }; // Fallback Padrão

      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status === 'granted') {
          // Corrida contra o tempo: GPS vs 4 Segundos
          const loc = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
          ]) as Location.LocationObject;

          finalCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      } catch (err) {
        console.warn('GPS Lento/Falhou no Emulador. Aplicando Coordenadas de Fallback.');
      }

      await api.post('/freights', { 
        itemId: currentChat?.item?.id,
        destinationLat: finalCoords.lat,
        destinationLng: finalCoords.lng
      });
    },
    onSuccess: () => {
      Alert.alert('Sucesso!', 'Frete solicitado com sucesso! O item já está no radar dos nossos motoristas parceiros.');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Não foi possível solicitar o frete no momento.';
      Alert.alert('Atenção', msg);
    }
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
    if (roomId) markMessagesAsRead();
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

        // LÓGICA DE BOT: Dispara a mensagem automática assim que o Socket abre
        if (autoMsg && !hasSentAutoMsg.current) {
          setTimeout(() => {
            socketRef.current?.emit('send_message', {
              roomId,
              content: autoMsg,
            });
            hasSentAutoMsg.current = true;
          }, 800); 
        }
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

    if (me?.id) connectSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId, me?.id, queryClient, autoMsg]);

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
        <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : (isFreightChat ? styles.otherBubbleFreight : styles.otherBubble)]}>
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{'< Voltar'}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerCenter}>
          {isFreightChat && (
            <View style={styles.freightBadge}>
              <Text style={styles.freightBadgeText}>🚚 Parceiro Logístico</Text>
            </View>
          )}

          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => {
              if (currentChat?.otherUser?.id) router.push(`/user/${currentChat.otherUser.id}`);
            }}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {currentChat ? currentChat.otherUser.fullName : 'Carregando...'}
            </Text>
          </TouchableOpacity>

          {currentChat && (
            <View style={styles.subContainer}>
              <View style={[styles.statusDot, { backgroundColor: isSocketConnected ? '#4CAF50' : '#F44336' }]} />
              <Text style={styles.headerSub} numberOfLines={1}>
                📦 {currentChat.item.title}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {currentChat?.type === 'DONATION' && (
            <TouchableOpacity 
              style={styles.requestFreightBtn}
              disabled={requestFreightMutation.isPending}
              onPress={() => {
                Alert.alert(
                  'Solicitar Frete Solidário', 
                  'Deseja colocar este item no radar dos nossos freteiros parceiros?', 
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sim, Solicitar', onPress: () => requestFreightMutation.mutate() }
                  ]
                );
              }}
            >
              {requestFreightMutation.isPending ? (
                 <ActivityIndicator size="small" color="#FFF" />
              ) : (
                 <Ionicons name="car-outline" size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* BANNER DE AVALIAÇÃO DOAÇÃO */}
      {currentChat?.type === 'DONATION' && itemDetails?.status === 'Doado' && !myReviewForThisItem && (
        <View style={styles.reviewBanner}>
          <View style={styles.reviewBannerTextContainer}>
            <Text style={styles.reviewBannerTitle}>Doação Concluída! 🎉</Text>
            <Text style={styles.reviewBannerSub}>Como foi negociar com {currentChat.otherUser.fullName}?</Text>
          </View>
          <TouchableOpacity 
            style={styles.reviewBannerBtn}
            onPress={() => router.push({
              pathname: '/review/create' as any,
              params: { revieweeId: currentChat.otherUser.id, revieweeName: currentChat.otherUser.fullName, itemId: currentChat.item.id }
            })}
          >
            <Text style={styles.reviewBannerBtnText}>⭐ Avaliar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* BANNER DE AVALIAÇÃO FRETE */}
      {currentChat?.type === 'FREIGHT' && !myReviewForThisItem && (
        <View style={[styles.reviewBanner, { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' }]}>
          <View style={styles.reviewBannerTextContainer}>
            <Text style={[styles.reviewBannerTitle, { color: '#E65100' }]}>Corrida em Andamento 🚚</Text>
            <Text style={styles.reviewBannerSub}>Avalie o motorista após a entrega ser concluída.</Text>
          </View>
          <TouchableOpacity 
            style={[styles.reviewBannerBtn, { backgroundColor: '#FF9800' }]}
            onPress={() => router.push({
              pathname: '/review/create' as any,
              params: { revieweeId: currentChat.otherUser.id, revieweeName: currentChat.otherUser.fullName, itemId: currentChat.item.id }
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
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled, isFreightChat && { backgroundColor: '#FF9800' }]} 
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingTop: 40, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#DDD', elevation: 2, zIndex: 10 },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  headerCenter: { flex: 2, alignItems: 'center' },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  backBtn: { padding: 5 },
  backBtnText: { fontSize: 16, color: '#2196F3', fontWeight: 'bold' },
  freightBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 2 },
  freightBadgeText: { color: '#E65100', fontSize: 10, fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textDecorationLine: 'underline' },
  subContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  headerSub: { fontSize: 12, color: '#666' },
  requestFreightBtn: { backgroundColor: '#FF9800', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2 },
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
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, elevation: 1 },
  myBubble: { backgroundColor: '#DCF8C6', borderBottomRightRadius: 4 }, 
  otherBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4 }, 
  otherBubbleFreight: { backgroundColor: '#FFF3E0', borderBottomLeftRadius: 4 }, 
  messageText: { fontSize: 16, lineHeight: 22, color: '#303030' },
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