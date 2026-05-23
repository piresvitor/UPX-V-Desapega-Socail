import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WebView } from 'react-native-webview'; 
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

interface ItemDetails {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrls: string[];
  status: 'Disponível' | 'Reservado' | 'Doado';
  createdAt: string;
  latitude: string | number;
  longitude: string | number;
  donor: { id: string; fullName: string };
}

interface UserMe {
  id: string;
  isVerified: boolean;
}

export default function ItemDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();

  // Estados para as novas funcionalidades da UI
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [isStatusModalVisible, setStatusModalVisible] = useState(false);

  const { data: item, isLoading: loadingItem, error: itemError } = useQuery<ItemDetails>({
    queryKey: ['item', id],
    queryFn: async () => (await api.get(`/items/${id}`)).data,
    retry: false,
  });

  const { data: me, isLoading: loadingMe } = useQuery<UserMe>({
    queryKey: ['users', 'me'],
    queryFn: async () => (await api.get('/users/me')).data,
    retry: false 
  });

  // 🔥 A Rota de Exclusão continua intacta no backend
  const deleteMutation = useMutation({
    mutationFn: async () => await api.delete(`/items/${id}`),
    onSuccess: () => {
      Alert.alert('Sucesso', 'A doação foi removida da plataforma.');
      queryClient.invalidateQueries({ queryKey: ['items'] });
      router.back();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => await api.patch(`/items/${id}/status`, { status: newStatus }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      setStatusModalVisible(false); // Fecha o modal após o sucesso
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async () => await api.post('/chats', { itemId: item?.id, type: 'DONATION' }),
    onSuccess: (response) => {
      router.push(`/chat/${response.data.roomId}`);
    },
    onError: () => Alert.alert('Erro', 'Não foi possível iniciar o chat. Tente novamente.')
  });

  const { isOwner, isLocked } = useMemo(() => {
    if (!item || !me) return { isOwner: false, isLocked: false };
    const ownerCheck = String(me.id) === String(item.donor?.id);
    const createdAtDate = item.createdAt ? new Date(item.createdAt).getTime() : Date.now();
    const hoursOld = (Date.now() - createdAtDate) / (1000 * 60 * 60);
    const lockedCheck = !ownerCheck && !me.isVerified && hoursOld < 24;
    return { isOwner: ownerCheck, isLocked: lockedCheck };
  }, [item, me]);

  const handleRequestDonation = () => {
    if (isLocked) {
      Alert.alert('Acesso Restrito', 'Usuários não verificados precisam aguardar 24h para solicitar itens novos.');
      return;
    }
    startChatMutation.mutate(); 
  };

  // 🔥 Agora a confirmação de exclusão é chamada pelo botão "Cancelado" no Modal
  const confirmDelete = () => {
    Alert.alert('Cancelar Doação', 'Tem certeza? Este item será removido definitivamente da plataforma.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Sim, Cancelar', onPress: () => deleteMutation.mutate(), style: 'destructive' }
    ]);
  };

  if (loadingItem || loadingMe) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#EB681E" /></View>;
  }

  if (itemError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>🔒 Acesso Restrito</Text>
        <Text style={styles.errorSub}>Este item está protegido pela prioridade social de 24h.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar ao Início</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!item || !me) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponível': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'Reservado': return { bg: '#FFF3E0', text: '#E65100' };
      case 'Doado': return { bg: '#E3F2FD', text: '#1565C0' };
      default: return { bg: '#F5F5F5', text: '#333333' };
    }
  };
  const statusColors = getStatusColor(item.status);

  const lat = Number(item?.latitude) || 0;
  const lng = Number(item?.longitude) || 0;
  const hasValidLocation = lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng);

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { padding: 0; margin: 0; background-color: #F8FAFC; }
            #map { width: 100%; height: 100vh; } 
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 15);
            L.tileLayer('https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
            L.circle([${lat}, ${lng}], {
                color: '#EB681E', 
                fillColor: '#EB681E',
                fillOpacity: 0.2,
                weight: 2,
                radius: 150
            }).addTo(map);
        </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.mainContainer}>
      
      {/* Botão Flutuante de Voltar */}
      <TouchableOpacity style={styles.floatingBackBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        
        {/* Carrossel de Imagens */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={[styles.carousel, { width: windowWidth }]}>
          {item.imageUrls?.length > 0 ? (
            item.imageUrls.map((url, index) => (
              <TouchableOpacity key={index} activeOpacity={0.9} onPress={() => setFullScreenImage(url)}>
                <Image source={{ uri: url }} style={[styles.image, { width: windowWidth }]} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.noImage, { width: windowWidth }]}><Text style={styles.noImageText}>Sem fotos disponíveis</Text></View>
          )}
        </ScrollView>

        <View style={styles.content}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}><Text style={styles.categoryText}>{item.category}</Text></View>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}><Text style={[styles.statusText, { color: statusColors.text }]}>{item.status}</Text></View>
          </View>

          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.donorInfoRow}>
            <Text style={{ fontSize: 15, color: '#64748B' }}>Postado por </Text>
            <TouchableOpacity onPress={() => router.push(`/user/${item.donor?.id}`)}>
              <Text style={styles.donorNameLink}>{item.donor?.fullName || 'Usuário'}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Descrição</Text>
          <Text style={styles.description}>{item.description}</Text>

          <Text style={styles.sectionTitle}>Localização Aproximada</Text>
          <View style={styles.mapContainer}>
            {hasValidLocation ? (
              <WebView
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                style={styles.map}
                scrollEnabled={false} 
                javaScriptEnabled={true} 
                domStorageEnabled={true} 
              />
            ) : (
              <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E2E8F0' }]}>
                <Ionicons name="location-outline" size={32} color="#94A3B8" />
                <Text style={{ color: '#64748B', marginTop: 8 }}>Localização indisponível</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          {isOwner ? (
            <View style={styles.ownerGrid}>
              <Text style={styles.ownerTitle}>Painel do Doador</Text>
              {/* 🔥 Botão de remover daqui foi apagado. Ficaram só as duas opções limpas. */}
              <View style={styles.ownerActionRow}>
                <TouchableOpacity style={[styles.btnHalf, styles.btnEdit]} onPress={() => router.push(`/item/edit/${id}`)}>
                  <Ionicons name="pencil-outline" size={20} color="#FFF" style={styles.buttonIcon} />
                  <Text style={styles.btnTextWhite}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnHalf, styles.btnOutline]} onPress={() => setStatusModalVisible(true)}>
                  <Ionicons name="refresh-outline" size={20} color="#334155" style={styles.buttonIcon} />
                  <Text style={styles.btnTextOutline}>Status</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            item.status === 'Doado' ? (
              <TouchableOpacity 
                style={[styles.btn, styles.btnOutline]} 
                onPress={() => router.push({
                  pathname: '/review/create',
                  params: { revieweeId: item.donor?.id, revieweeName: item.donor?.fullName, itemId: item.id }
                })}
              >
                <Ionicons name="star-outline" size={20} color="#EB681E" style={styles.buttonIcon} />
                <Text style={[styles.btnTextOutline, { color: '#EB681E' }]}>Avaliar Doador</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.btn, isLocked ? styles.btnLocked : styles.btnPrimary]} 
                onPress={handleRequestDonation}
                activeOpacity={0.8}
                disabled={startChatMutation.isPending || isLocked}
              >
                {startChatMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="chatbubbles-outline" size={20} color="#FFF" style={styles.buttonIcon} />
                    <Text style={styles.btnTextWhite}>{isLocked ? '🔒 Bloqueado (Janela 24h)' : 'Solicitar Doação / Chat'}</Text>
                  </>
                )}
              </TouchableOpacity>
            )
          )}
        </View>
      </ScrollView>

      {/* Modal de Imagem em Tela Cheia */}
      <Modal visible={!!fullScreenImage} transparent={true} animationType="fade">
        <View style={styles.fullScreenModal}>
          <TouchableOpacity style={styles.closeImageBtn} onPress={() => setFullScreenImage(null)}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          {fullScreenImage && (
            <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} />
          )}
        </View>
      </Modal>

      {/* Modal Customizado de Status (Bottom Sheet) */}
      <Modal visible={isStatusModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.statusModalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.statusModalTitle}>Alterar Status</Text>
                <Text style={styles.statusModalSub}>Escolha o status atual da sua doação:</Text>
              </View>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.statusGrid}>
              <TouchableOpacity style={[styles.statusCard, item.status === 'Disponível' && styles.statusCardActive]} onPress={() => updateStatusMutation.mutate('Disponível')}>
                <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                <Text style={[styles.statusCardText, item.status === 'Disponível' && { color: '#10B981', fontWeight: 'bold' }]}>Disponível</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.statusCard, item.status === 'Reservado' && styles.statusCardActive]} onPress={() => updateStatusMutation.mutate('Reservado')}>
                <Ionicons name="time" size={28} color="#F59E0B" />
                <Text style={[styles.statusCardText, item.status === 'Reservado' && { color: '#F59E0B', fontWeight: 'bold' }]}>Reservado</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.statusCard, item.status === 'Doado' && styles.statusCardActive]} onPress={() => updateStatusMutation.mutate('Doado')}>
                <Ionicons name="gift" size={28} color="#3B82F6" />
                <Text style={[styles.statusCardText, item.status === 'Doado' && { color: '#3B82F6', fontWeight: 'bold' }]}>Doado</Text>
              </TouchableOpacity>

              {/* 🔥 Card Cancelado agora fecha o modal e puxa a função de Exclusão do Banco */}
              <TouchableOpacity style={styles.statusCard} onPress={() => { setStatusModalVisible(false); confirmDelete(); }}>
                <Ionicons name="close-circle" size={28} color="#EF4444" />
                <Text style={[styles.statusCardText, { color: '#EF4444', fontWeight: 'bold' }]}>Cancelar Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  
  floatingBackBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 40, left: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  
  fullScreenModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeImageBtn: { position: 'absolute', top: 50, right: 20, zIndex: 20, padding: 10 },
  fullScreenImage: { width: '100%', height: '80%', resizeMode: 'contain' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  statusModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  statusModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  statusModalSub: { fontSize: 14, color: '#64748B', marginTop: 4 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statusCard: { width: '48%', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  statusCardActive: { borderColor: '#94A3B8', backgroundColor: '#F1F5F9', borderWidth: 2 },
  statusCardText: { fontSize: 14, fontWeight: '600', color: '#64748B', marginTop: 8 },

  carousel: { height: 320, backgroundColor: '#E2E8F0' },
  image: { height: 320, resizeMode: 'cover' },
  noImage: { height: 320, justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#94A3B8', fontWeight: '500' },
  
  content: { padding: 24, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  categoryBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  categoryText: { color: '#475569', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  
  title: { fontSize: 26, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
  categorySubText: { display: 'none' }, 
  donorInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  donorNameLink: { fontSize: 15, color: '#EB681E', fontWeight: 'bold', textDecorationLine: 'underline' },
  
  divider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 20 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  description: { fontSize: 16, color: '#475569', lineHeight: 24, marginBottom: 25 },
  
  mapContainer: { borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  map: { width: '100%', height: 220, backgroundColor: '#F8FAFC' },
  
  footer: { paddingHorizontal: 24, marginTop: 10 },
  ownerTitle: { fontSize: 14, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' },
  ownerGrid: { gap: 12 },
  ownerActionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  btnHalf: { flex: 1, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  btnEdit: { backgroundColor: '#334155' }, 
  btn: { height: 56, borderRadius: 14, padding: 16, justifyContent: 'center', alignItems: 'center', width: '100%', flexDirection: 'row' },
  btnPrimary: { backgroundColor: '#EB681E', shadowColor: '#EB681E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  btnLocked: { backgroundColor: '#94A3B8' },
  btnOutline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' },
  
  btnTextWhite: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  btnTextOutline: { color: '#334155', fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 },
  
  errorText: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  errorSub: { fontSize: 15, textAlign: 'center', color: '#64748B', marginBottom: 25 },
  backBtn: { paddingVertical: 14, paddingHorizontal: 24, backgroundColor: '#F1F5F9', borderRadius: 12 },
  backBtnText: { color: '#0F172A', fontWeight: 'bold' },
});