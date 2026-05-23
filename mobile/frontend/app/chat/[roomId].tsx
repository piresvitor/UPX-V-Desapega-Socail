import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { io, Socket } from "socket.io-client";
import { api } from "../../src/services/api";

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export default function ChatRoomScreen() {
  const { roomId, autoMsg } = useLocalSearchParams<{
    roomId: string;
    autoMsg?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  // 🔥 Novo estado para controlar o Modal de Frete
  const [isFreightModalVisible, setIsFreightModalVisible] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const hasSentAutoMsg = useRef(false);

  const { data: me } = useQuery({
    queryKey: ["users", "me"],
    queryFn: async () => (await api.get("/users/me")).data,
  });

  const { data: chats } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => (await api.get("/chats")).data,
  });

  const currentChat = chats?.find((c: any) => c.id === roomId);
  const isFreightChat = currentChat?.type === "FREIGHT";

  const { data: itemDetails } = useQuery({
    queryKey: ["item", currentChat?.item?.id],
    queryFn: async () =>
      (await api.get(`/items/${currentChat?.item?.id}`)).data,
    enabled: !!currentChat?.item?.id,
  });

  const { data: myReviewForThisItem } = useQuery({
    queryKey: [
      "review_check",
      me?.id,
      currentChat?.otherUser?.id,
      currentChat?.item?.id,
    ],
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
    queryKey: ["chatMessages", roomId],
    queryFn: async () => {
      const response = await api.get(
        `/chats/${roomId}/messages?page=1&limit=50`,
      );
      setMessages(response.data);
      return response.data;
    },
    enabled: !!roomId,
  });

  const requestFreightMutation = useMutation({
    mutationFn: async () => {
      let finalCoords = { lat: -23.5015, lng: -47.4581 };

      try {
        let { status } = await Location.requestForegroundPermissionsAsync();

        if (status === "granted") {
          const loc = (await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), 4000),
            ),
          ])) as Location.LocationObject;

          finalCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      } catch (err) {
        console.warn(
          "GPS Lento/Falhou no Emulador. Aplicando Coordenadas de Fallback.",
        );
      }

      await api.post("/freights", {
        itemId: currentChat?.item?.id,
        destinationLat: finalCoords.lat,
        destinationLng: finalCoords.lng,
      });
    },
    onSuccess: () => {
      setIsFreightModalVisible(false); // Fecha o modal após sucesso
      Alert.alert(
        "Sucesso!",
        "Frete solicitado com sucesso! O item já está no radar dos nossos motoristas parceiros.",
      );
    },
    onError: (error: any) => {
      setIsFreightModalVisible(false); // Fecha o modal em caso de erro também
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Não foi possível solicitar o frete no momento.";
      Alert.alert("Atenção", msg);
    },
  });

  useEffect(() => {
    const markMessagesAsRead = async () => {
      try {
        await api.patch(`/chats/${roomId}/read`);
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      } catch (error) {
        console.error("Erro ao marcar mensagens como lidas", error);
      }
    };
    if (roomId) markMessagesAsRead();
  }, [roomId, queryClient]);

  useEffect(() => {
    const connectSocket = async () => {
      const token = await AsyncStorage.getItem("@DesapegaSocial:token");
      const BACKEND_URL = "https://desapega-social-api.onrender.com";

      socketRef.current = io(BACKEND_URL, {
        auth: { token },
        transports: ["websocket"],
      });

      socketRef.current.on("connect", () => {
        setIsSocketConnected(true);
        socketRef.current?.emit("join_room", { roomId });

        if (autoMsg && !hasSentAutoMsg.current) {
          setTimeout(() => {
            socketRef.current?.emit("send_message", {
              roomId,
              content: autoMsg,
            });
            hasSentAutoMsg.current = true;
          }, 800);
        }
      });

      socketRef.current.on("receive_message", (newMessage: Message) => {
        setMessages((prevMessages) => [newMessage, ...prevMessages]);

        if (newMessage.senderId !== me?.id) {
          api
            .patch(`/chats/${roomId}/read`)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ["chats"] });
            })
            .catch(console.error);
        }
      });

      socketRef.current.on("connect_error", (err) => {
        console.warn("Erro de conexão no Socket:", err.message);
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
      Alert.alert("Aguarde", "Conectando ao chat...");
      return;
    }

    socketRef.current?.emit("send_message", {
      roomId,
      content: inputText.trim(),
    });

    setInputText("");
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = String(item.senderId) === String(me?.id);

    const msgDate = new Date(item.createdAt);
    const isToday = msgDate.toDateString() === new Date().toLocaleDateString();
    const timeString = msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateString = isToday ? timeString : `${msgDate.toLocaleDateString([], {day: '2-digit', month: '2-digit'})} ${timeString}`;

    return (
      <View
        style={[
          styles.messageWrapper,
          isMyMessage ? styles.messageWrapperRight : styles.messageWrapperLeft,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMyMessage
              ? styles.myBubble
              : isFreightChat
                ? styles.otherBubbleFreight
                : styles.otherBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.timeText,
              isMyMessage ? styles.myTimeText : styles.otherTimeText,
            ]}
          >
            {dateString}
          </Text>
        </View>
      </View>
    );
  };

  return (
    // 🔥 Removemos o "top" do edges para não duplicar a margem superior
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#EB681E" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            {isFreightChat && (
              <View style={styles.freightBadge}>
                <Text style={styles.freightBadgeText}>
                  🚚 Parceiro Logístico
                </Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (currentChat?.otherUser?.id)
                  router.push(`/user/${currentChat.otherUser.id}`);
              }}
            >
              <Text style={styles.headerTitle} numberOfLines={1}>
                {currentChat ? currentChat.otherUser.fullName : "Carregando..."}
              </Text>
            </TouchableOpacity>

            {currentChat && (
              <View style={styles.subContainer}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isSocketConnected
                        ? "#10B981" 
                        : "#EF4444", 
                    },
                  ]}
                />
                <Text style={styles.headerSub} numberOfLines={1}>
                  📦 {currentChat.item.title}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerRight}>
            {currentChat?.type === "DONATION" && me?.role !== "Freteiro" && (
              <TouchableOpacity
                style={styles.requestFreightBtn}
                onPress={() => setIsFreightModalVisible(true)} // 🔥 Abre o novo Modal
              >
                <Ionicons name="car-outline" size={20} color="#EB681E" />
                <Text style={styles.requestFreightBtnText}>Frete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* BANNER DE AVALIAÇÃO DOAÇÃO */}
        {currentChat?.type === "DONATION" &&
          itemDetails?.status === "Doado" &&
          !myReviewForThisItem && (
            <View style={styles.reviewBanner}>
              <View style={styles.reviewBannerTextContainer}>
                <Text style={styles.reviewBannerTitle}>
                  Doação Concluída! 🎉
                </Text>
                <Text style={styles.reviewBannerSub}>
                  Como foi negociar com {currentChat.otherUser.fullName}?
                </Text>
              </View>
              <TouchableOpacity
                style={styles.reviewBannerBtn}
                onPress={() =>
                  router.push({
                    pathname: "/review/create" as any,
                    params: {
                      revieweeId: currentChat.otherUser.id,
                      revieweeName: currentChat.otherUser.fullName,
                      itemId: currentChat.item.id,
                    },
                  })
                }
              >
                <Text style={styles.reviewBannerBtnText}>⭐ Avaliar</Text>
              </TouchableOpacity>
            </View>
          )}

        {/* BANNER DE AVALIAÇÃO FRETE */}
        {currentChat?.type === "FREIGHT" && !myReviewForThisItem && (
          <View
            style={[
              styles.reviewBanner,
              { backgroundColor: "#FFF3E0", borderColor: "#FFB74D" },
            ]}
          >
            <View style={styles.reviewBannerTextContainer}>
              <Text style={[styles.reviewBannerTitle, { color: "#E65100" }]}>
                Corrida em Andamento 🚚
              </Text>
              <Text style={styles.reviewBannerSub}>
                Avalie o motorista após a entrega ser concluída.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.reviewBannerBtn, { backgroundColor: "#FF9800" }]}
              onPress={() =>
                router.push({
                  pathname: "/review/create" as any,
                  params: {
                    revieweeId: currentChat.otherUser.id,
                    revieweeName: currentChat.otherUser.fullName,
                    itemId: currentChat.item.id,
                  },
                })
              }
            >
              <Text style={styles.reviewBannerBtnText}>⭐ Avaliar</Text>
            </TouchableOpacity>
          </View>
        )}

        {loadingHistory ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#EB681E" />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item, index) => item.id || String(index)}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            inverted
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        <View
          style={[
            styles.inputContainer,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <TextInput
            style={styles.textInput}
            placeholder="Digite sua mensagem..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 🔥 MODAL DE SOLICITAÇÃO DE FRETE (NOVO) 🔥 */}
      <Modal visible={isFreightModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.freightModalContent}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Solicitar Frete Solidário</Text>
                <Text style={styles.modalSub}>Coloque este item no radar dos motoristas.</Text>
              </View>
              <TouchableOpacity onPress={() => setIsFreightModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.freightModalBody}>
              <View style={styles.freightIconCircle}>
                <Ionicons name="car-outline" size={42} color="#EB681E" />
              </View>
              <Text style={styles.freightModalText}>
                Ao confirmar, nossos motoristas parceiros serão notificados e poderão enviar propostas para transportar sua doação com segurança.
              </Text>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setIsFreightModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={() => requestFreightMutation.mutate()}
                disabled={requestFreightMutation.isPending}
              >
                {requestFreightMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Sim, Solicitar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40, // 🔥 Margin superior ajustada
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    zIndex: 10,
  },
  headerLeft: { flex: 1, alignItems: "flex-start" },
  headerCenter: { flex: 3, alignItems: "center" }, // Aumentado para o título caber melhor
  headerRight: { flex: 1, alignItems: "flex-end" },
  backBtn: { padding: 6 },
  
  freightBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 2,
  },
  freightBadgeText: { color: "#EB681E", fontSize: 10, fontWeight: "bold" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
  },
  subContainer: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  headerSub: { fontSize: 12, color: "#64748B" },
  
  requestFreightBtn: {
    backgroundColor: "#FFF3EB",
    borderColor: "#EB681E",
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  requestFreightBtnText: { color: "#EB681E", fontWeight: "bold", marginLeft: 4, fontSize: 12 },

  // 🔥 Estilos do Novo Modal de Frete
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  freightModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  modalSub: { fontSize: 14, color: '#64748B', marginTop: 4 },
  freightModalBody: { alignItems: 'center', marginBottom: 24, backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16 },
  freightIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF3EB', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  freightModalText: { fontSize: 15, color: '#334155', textAlign: 'center', lineHeight: 22 },
  modalActionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalBtnCancel: { flex: 1, paddingVertical: 16, backgroundColor: '#F1F5F9', borderRadius: 14, alignItems: 'center' },
  modalBtnCancelText: { color: '#64748B', fontWeight: 'bold', fontSize: 16 },
  modalBtnConfirm: { flex: 1, paddingVertical: 16, backgroundColor: '#EB681E', borderRadius: 14, alignItems: 'center', shadowColor: '#EB681E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 2 },
  modalBtnConfirmText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },

  reviewBanner: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#FCD34D",
    elevation: 1,
  },
  reviewBannerTextContainer: { flex: 1, paddingRight: 10 },
  reviewBannerTitle: { fontSize: 14, fontWeight: "bold", color: "#D97706" },
  reviewBannerSub: { fontSize: 12, color: "#475569", marginTop: 2 },
  reviewBannerBtn: {
    backgroundColor: "#F59E0B",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  reviewBannerBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 10 },
  messageWrapper: { flexDirection: "row", marginBottom: 12 },
  messageWrapperRight: { justifyContent: "flex-end" },
  messageWrapperLeft: { justifyContent: "flex-start" },
  
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 1,
  },
  myBubble: { backgroundColor: "#FFF3EB", borderBottomRightRadius: 6 }, 
  otherBubble: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 6 }, 
  otherBubbleFreight: { backgroundColor: "#FEF3C7", borderBottomLeftRadius: 6 },
  
  messageText: { fontSize: 15, lineHeight: 22, color: "#0F172A" },
  myMessageText: { color: "#0F172A" },
  otherMessageText: { color: "#0F172A" },
  
  timeText: {
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
    color: "#94A3B8",
  },
  myTimeText: { color: "#EB681E", opacity: 0.8 }, 
  otherTimeText: { color: "#94A3B8" },
  
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderColor: "#E2E8F0"
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 48,
    maxHeight: 110,
    fontSize: 16,
    color: "#0F172A",
  },
  sendBtn: {
    marginLeft: 12,
    backgroundColor: "#EB681E",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#CBD5E1" },
});