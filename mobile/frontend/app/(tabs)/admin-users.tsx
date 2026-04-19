import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // <-- useInfiniteQuery adicionado
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 
import { api } from '../../src/services/api';

export default function AdminUsersScreen() {
  const queryClient = useQueryClient();
  const router = useRouter(); 
  const [search, setSearch] = useState('');

  // ========================================================================
  // PAGINAÇÃO INFINITA (INFINITE SCROLL)
  // ========================================================================
  const { 
    data, 
    isLoading, 
    refetch, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['admin', 'users', search],
    queryFn: async ({ pageParam = 1 }) => {
      // Chama a API passando a página atual e o limite de 10 por vez
      const response = await api.get(`/admin/users?search=${search}&page=${pageParam}&limit=10`);
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // Se a última página veio lotada (10 itens), significa que provavelmente tem uma próxima.
      // Se vier menos que 10, chegamos ao fim do banco de dados.
      return lastPage?.length === 10 ? allPages.length + 1 : undefined;
    },
  });

  // O TanStack separa os dados em 'páginas' (arrays dentro de um array). 
  // O .flat() junta tudo numa lista única para o FlatList ler perfeitamente.
  const users = data?.pages?.flat() || [];

  const banMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string, action: 'Banir' | 'Restaurar' }) => {
      await api.patch(`/admin/users/${id}/ban`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => Alert.alert('Erro', 'Não foi possível alterar o status da conta.')
  });

  const handleToggleBan = (user: any) => {
    const isBanned = !!user.deletedAt;
    const actionStr = isBanned ? 'Restaurar' : 'Banir';
    
    Alert.alert(
      `${actionStr} Usuário`, 
      `Tem certeza que deseja ${actionStr.toLowerCase()} a conta de ${user.fullName}?`, 
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: `Sim, ${actionStr}`, onPress: () => banMutation.mutate({ id: user.id, action: actionStr }), style: isBanned ? 'default' : 'destructive' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people" size={32} color="#111827" />
        <Text style={styles.title}>Gestão de Usuários</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Buscar por nome ou email..." 
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#111827" /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          onRefresh={refetch}
          refreshing={isLoading}
          contentContainerStyle={{ padding: 15 }}
          
          // --- CONFIGURAÇÕES DO INFINITE SCROLL ---
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage(); // Puxa a próxima página quando chegar a 50% do fim da lista
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator size="small" color="#2196F3" style={styles.footerLoader} /> : null
          }
          // -----------------------------------------

          renderItem={({ item }: any) => {
            const isBanned = !!item.deletedAt;
            const ratingAvg = item.ratingAverage ? Number(item.ratingAverage).toFixed(1) : '0.0';

            return (
              <View style={[styles.card, isBanned && styles.cardBanned]}>
                <TouchableOpacity 
                  style={styles.cardInfo} 
                  activeOpacity={0.7}
                  onPress={() => router.push(`/user/${item.id}`)}
                >
                  <View style={styles.nameRow}>
                    <Text style={[styles.userName, isBanned && {textDecorationLine: 'line-through', color: '#9CA3AF'}]} numberOfLines={1}>
                      {item.fullName}
                    </Text>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{ratingAvg}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                  
                  <View style={styles.badges}>
                    <Text style={styles.roleBadge}>{item.role}</Text>
                    {item.isVerified && <Text style={styles.verifiedBadge}>Verificado</Text>}
                    {isBanned && <Text style={styles.bannedBadge}>BANIDO</Text>}
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.banBtn, isBanned && styles.restoreBtn]} 
                  onPress={() => handleToggleBan(item)}
                >
                  <Ionicons name={isBanned ? "refresh-outline" : "hammer-outline"} size={24} color={isBanned ? "#10B981" : "#DC2626"} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB', elevation: 2 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginTop: 10, marginBottom: 15 },
  searchBox: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', padding: 14, borderRadius: 10, alignItems: 'center' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1F2937' },
  
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 12, elevation: 2, alignItems: 'center' },
  cardBanned: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 },
  
  cardInfo: { flex: 1, paddingRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', flexShrink: 1, marginRight: 8 },
  
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ratingText: { color: '#B45309', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  
  userEmail: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
  
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleBadge: { backgroundColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 11, fontWeight: 'bold', color: '#4B5563' },
  verifiedBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 11, fontWeight: 'bold', color: '#047857' },
  bannedBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 11, fontWeight: 'bold', color: '#B91C1C' },
  
  banBtn: { padding: 10, backgroundColor: '#FEE2E2', borderRadius: 8, marginLeft: 10 },
  restoreBtn: { backgroundColor: '#E8F5E9' },

  footerLoader: { paddingVertical: 20 }
});