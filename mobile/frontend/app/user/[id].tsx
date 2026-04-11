import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, FlatList, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/services/api';

interface PublicProfile {
  id: string;
  fullName: string;
  role: string;
  isVerified: boolean;
  ratingAverage: string | null;
  ratingCount: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: { id: string; fullName: string; };
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // 1. Busca os Dados Públicos do Usuário
  const { data: profile, isLoading: loadingProfile, isError } = useQuery<PublicProfile>({
    queryKey: ['users', id],
    queryFn: async () => (await api.get(`/users/${id}`)).data
  });

  // 2. Busca as Avaliações que ele recebeu
  const { data: reviews, isLoading: loadingReviews } = useQuery<Review[]>({
    queryKey: ['reviews', id],
    queryFn: async () => (await api.get(`/reviews/${id}`)).data,
  });

  if (loadingProfile) return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
  if (isError || !profile) return <View style={styles.center}><Text style={styles.error}>Perfil não encontrado.</Text></View>;

  return (
    <View style={styles.container}>
      {/* HEADER FIXO DO PERFIL */}
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{profile.fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{profile.fullName}</Text>
        
        {profile.isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Usuário Autenticado Via IA</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>⭐ {profile.ratingAverage ? Number(profile.ratingAverage).toFixed(1) : 'N/A'}</Text>
            <Text style={styles.statLabel}>Nota</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>💬 {profile.ratingCount || 0}</Text>
            <Text style={styles.statLabel}>Avaliações</Text>
          </View>
        </View>
      </View>

      {/* LISTA DE AVALIAÇÕES */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>O que dizem sobre {profile.fullName.split(' ')[0]}:</Text>
        
        {loadingReviews ? (
           <ActivityIndicator color="#2196F3" style={{marginTop: 20}} />
        ) : (
          <FlatList
            data={reviews}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{item.reviewer.fullName}</Text>
                  <Text style={styles.reviewDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.reviewStars}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
                <Text style={styles.reviewComment}>{item.comment}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Este usuário ainda não possui avaliações públicas.</Text>}
          />
        )}
      </View>
      
      {/* Botão flutuante para voltar */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: 'red', fontSize: 16, fontWeight: 'bold' },

  header: { backgroundColor: '#fff', padding: 30, alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee', elevation: 2 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  
  verifiedBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8, borderWidth: 1, borderColor: '#4CAF50' },
  verifiedText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },

  statsRow: { flexDirection: 'row', marginTop: 20, backgroundColor: '#f9f9f9', borderRadius: 12, padding: 15, width: '100%', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { color: '#777', fontSize: 12, marginTop: 4 },
  dividerVertical: { width: 1, backgroundColor: '#ddd' },

  listContainer: { flex: 1, padding: 20 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  
  reviewCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  reviewerName: { fontWeight: 'bold', color: '#111', fontSize: 15 },
  reviewDate: { color: '#999', fontSize: 12 },
  reviewStars: { color: '#FFA000', fontSize: 16, marginBottom: 8 },
  reviewComment: { color: '#555', fontSize: 14, lineHeight: 20 },
  
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40, fontStyle: 'italic' },

  backBtn: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: '#333', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, elevation: 5 },
  backBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});