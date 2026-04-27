import React, { useMemo } from 'react';
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
  status: 'Disponível' | 'Reservado' | 'Doado' | 'Cancelado';
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
      Alert.alert('Sucesso', `Status atualizado para: ${variables}`);
      queryClient.invalidateQueries({ queryKey: ['item', id] });
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

  const confirmDelete = () => {
    Alert.alert('Remover Doação', 'Tem certeza? Este item será ocultado da plataforma.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sim, Remover', onPress: () => deleteMutation.mutate(), style: 'destructive' }
    ]);
  };

  const handleStatusChange = () => {
    Alert.alert('Alterar Status', 'Escolha o status atual da sua doação:', [
      { text: 'Disponível', onPress: () => updateStatusMutation.mutate('Disponível') },
      { text: 'Reservado', onPress: () => updateStatusMutation.mutate('Reservado') },
      { text: 'Doado', onPress: () => updateStatusMutation.mutate('Doado') },
      { text: 'Cancelado', onPress: () => updateStatusMutation.mutate('Cancelado'), style: 'destructive' },
      { text: 'Voltar', style: 'cancel' }
    ]);
  };

  if (loadingItem || loadingMe) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
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
      case 'Cancelado': return { bg: '#FFEBEE', text: '#C62828' };
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
            body { padding: 0; margin: 0; background-color: #F3F4F6; }
            #map { width: 100%; height: 100vh; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            // Inicializa o mapa com zoom 15 (ideal para bairros)
            var map = L.map('map', {
                zoomControl: false,
                attributionControl: false
            }).setView([${lat}, ${lng}], 15);

            // Puxa as imagens do servidor super rápido e grátis do CartoDB
            L.tileLayer('https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(map);

            // Desenha o círculo azul semitransparente
            L.circle([${lat}, ${lng}], {
                color: '#2196F3',
                fillColor: '#2196F3',
                fillOpacity: 0.2,
                weight: 2,
                radius: 150
            }).addTo(map);
        </script>
    </body>
    </html>
  `;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={[styles.carousel, { width: windowWidth }]}>
        {item.imageUrls?.length > 0 ? (
          item.imageUrls.map((url, index) => (
            <Image key={index} source={{ uri: url }} style={[styles.image, { width: windowWidth }]} />
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
        <Text style={styles.categorySubText}>📦 Categoria: {item.category}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <Text style={{ fontSize: 15, color: '#666' }}>Postado por </Text>
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
              scrollEnabled={false} // Desabilita o scroll da "página" para o usuário só mexer no mapa
            />
          ) : (
            <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E7EB' }]}>
              <Ionicons name="location-outline" size={32} color="#9CA3AF" />
              <Text style={{ color: '#6B7280', marginTop: 8 }}>Localização indisponível</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        {isOwner ? (
          <View style={styles.ownerGrid}>
            <Text style={styles.ownerTitle}>Painel do Doador</Text>
            <View style={styles.ownerActionRow}>
              <TouchableOpacity style={[styles.btnHalf, styles.btnEdit]} onPress={() => router.push(`/item/edit/${id}`)}>
                <Ionicons name="pencil-outline" size={20} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.btnTextWhite}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnHalf, styles.btnOutline]} onPress={handleStatusChange}>
                <Ionicons name="refresh-outline" size={20} color="#2196F3" style={styles.buttonIcon} />
                <Text style={styles.btnTextOutline}>Status</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" style={styles.buttonIcon} />
              <Text style={styles.btnDangerText}>Remover Doação</Text>
            </TouchableOpacity>
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
              <Ionicons name="star-outline" size={20} color="#2196F3" style={styles.buttonIcon} />
              <Text style={styles.btnTextOutline}>Avaliar Doador</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  carousel: { height: 280, backgroundColor: '#E0E0E0' },
  image: { height: 280, resizeMode: 'cover' },
  noImage: { height: 280, justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#888', fontWeight: '500' },
  content: { padding: 20 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  categoryBadge: { backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  categoryText: { color: '#555', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 6 },
  categorySubText: { fontSize: 14, color: '#2196F3', fontWeight: 'bold', marginBottom: 6 },
  divider: { height: 1, backgroundColor: '#D1D5DB', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  description: { fontSize: 16, color: '#6B7280', lineHeight: 24, marginBottom: 25 },
  donorNameLink: { fontSize: 15, color: '#2196F3', fontWeight: 'bold', textDecorationLine: 'underline' },
  mapContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#D1D5DB', elevation: 2 },
  map: { width: '100%', height: 200, backgroundColor: '#F3F4F6' },
  footer: { paddingHorizontal: 20, marginTop: 10 },
  ownerTitle: { fontSize: 15, fontWeight: 'bold', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' },
  ownerGrid: { gap: 10 },
  ownerActionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  btnHalf: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  btnEdit: { backgroundColor: '#10B981' }, 
  btn: { height: 56, borderRadius: 12, padding: 16, justifyContent: 'center', alignItems: 'center', width: '100%', flexDirection: 'row' },
  btnPrimary: { backgroundColor: '#FF9800' },
  btnLocked: { backgroundColor: '#9CA3AF' },
  btnOutline: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#2196F3' },
  btnDanger: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' }, 
  btnTextWhite: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  btnTextOutline: { color: '#2196F3', fontSize: 16, fontWeight: 'bold' },
  btnDangerText: { color: '#DC2626', fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 },
  errorText: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 },
  errorSub: { fontSize: 15, textAlign: 'center', color: '#6B7280', marginBottom: 25 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#E5E7EB', borderRadius: 8 },
  backBtnText: { color: '#1F2937', fontWeight: 'bold' },
});