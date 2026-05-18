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
      Alert.alert(
        "Sucesso!",
        "Frete solicitado com sucesso! O item já está no radar dos nossos motoristas parceiros.",
      );
    },
    onError: (error: any) => {
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
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
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
              <Ionicons name="arrow-back" size={24} color="#2196F3" />
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
                        ? "#4CAF50"
                        : "#F44336",
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
            {/* CORREÇÃO: O ÍCONE SÓ APARECE SE NÃO FOR FRETEIRO*/}
            {currentChat?.type === "DONATION" && me?.role !== "Freteiro" && (
              <TouchableOpacity
                style={styles.requestFreightBtn}
                disabled={requestFreightMutation.isPending}
                onPress={() => {
                  Alert.alert(
                    "Solicitar Frete Solidário",
                    "Deseja colocar este item no radar dos nossos freteiros parceiros?",
                    [
                      { text: "Cancelar", style: "cancel" },
                      {
                        text: "Sim, Solicitar",
                        onPress: () => requestFreightMutation.mutate(),
                      },
                    ],
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
            <ActivityIndicator size="large" color="#2196F3" />
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
          {/* CORREÇÃO: COR DO TEXTO E PLACEHOLDER BLINDADOS PARA DISPOSITIVO FÍSICO */}
          <TextInput
            style={styles.textInput}
            placeholder="Digite sua mensagem..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
              isFreightChat && { backgroundColor: "#FF9800" },
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingTop: 40,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    zIndex: 10,
  },
  headerLeft: { flex: 1, alignItems: "flex-start" },
  headerCenter: { flex: 2, alignItems: "center" },
  headerRight: { flex: 1, alignItems: "flex-end" },
  backBtn: { padding: 6 },
  freightBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 2,
  },
  freightBadgeText: { color: "#E65100", fontSize: 10, fontWeight: "bold" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    textDecorationLine: "underline",
  },
  subContainer: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  headerSub: { fontSize: 12, color: "#64748B" },
  requestFreightBtn: {
    backgroundColor: "#FF9800",
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  reviewBanner: {
    flexDirection: "row",
    backgroundColor: "#FFF9C4",
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#FBC02D",
    elevation: 1,
  },
  reviewBannerTextContainer: { flex: 1, paddingRight: 10 },
  reviewBannerTitle: { fontSize: 14, fontWeight: "bold", color: "#F57F17" },
  reviewBannerSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  reviewBannerBtn: {
    backgroundColor: "#FF9800",
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
    padding: 14,
    borderRadius: 18,
    elevation: 1,
  },
  myBubble: { backgroundColor: "#E8F5E9", borderBottomRightRadius: 6 },
  otherBubble: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 6 },
  otherBubbleFreight: { backgroundColor: "#FFF3E0", borderBottomLeftRadius: 6 },
  messageText: { fontSize: 16, lineHeight: 24, color: "#111827" },
  myMessageText: { color: "#111827" },
  otherMessageText: { color: "#111827" },
  timeText: {
    fontSize: 11,
    alignSelf: "flex-end",
    marginTop: 6,
    color: "#64748B",
  },
  myTimeText: { color: "#64748B" },
  otherTimeText: { color: "#64748B" },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "flex-end",
  },

  //Cor fixa e fundo reforçado para evitar bug de UI no Android
  textInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 48,
    maxHeight: 110,
    fontSize: 16,
    color: "#111827",
  },

  sendBtn: {
    marginLeft: 12,
    backgroundColor: "#2563EB",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#94A3B8" },
});
