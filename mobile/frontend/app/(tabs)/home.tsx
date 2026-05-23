import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/services/api";

interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrls: string[];
  status: string;
  distance?: number; // O PostGIS deve retornar a distância calculada
  donor: {
    id: string;
    fullName: string;
  };
}

const CATEGORIES = [
  "Todos",
  "Móveis",
  "Eletrônicos",
  "Roupas",
  "Alimentos",
  "Outros",
];
const RADIUS_OPTIONS = [5, 10, 25, 50]; // Opções de raio em Km

export default function HomeScreen() {
  const { signOut } = useAuth();
  const router = useRouter();

  // Estados do GPS e Filtros
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [radiusKm, setRadiusKm] = useState(10);

  const [refreshing, setRefreshing] = useState(false);

  // 1. Pega a localização
  useEffect(() => {
    async function getUserLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(
          "Precisamos da permissão de GPS para mostrar doações próximas.",
        );
        return;
      }
      try {
        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
        });
      } catch (error) {
        console.log(
          "GPS falhou. Usando localização de Sorocaba-SP como Fallback",
        );
        setLocation({ lat: -23.5015, lng: -47.4581 });
      }
    }
    getUserLocation();
  }, []);

  // 2. Busca na API (TanStack Query)
  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useQuery<Item[]>({
    queryKey: [
      "items",
      location?.lat,
      location?.lng,
      radiusKm,
      selectedCategory,
    ],
    queryFn: async () => {
      const response = await api.get("/items", {
        params: {
          lat: location?.lat,
          lng: location?.lng,
          radius: radiusKm * 1000,
          category: selectedCategory !== "Todos" ? selectedCategory : undefined,
          page: 1, 
          limit: 10,
        },
      });
      return response.data;
    },
    enabled: !!location,
  });

  // 3. Função do Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Filtro local provisório para a Barra de Busca
  const filteredItems = items?.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!location && !locationError) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EB681E" />
        <Text style={styles.text}>
          Buscando sua localização via satélite...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* --- HEADER PADRONIZADO --- */}
      <View style={styles.header}>
        <Text style={styles.title}>Doações Próximas</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons
            name="log-out-outline"
            size={16}
            color="#DC2626"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* --- SEÇÃO DE FILTROS --- */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar itens..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Filtro Horizontal de Categorias */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollHorizontal}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                selectedCategory === cat && styles.chipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategory === cat && styles.chipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filtro de Distância (Raio) */}
        <View style={styles.radiusContainer}>
          <Text style={styles.radiusLabel}>Distância Máxima:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {RADIUS_OPTIONS.map((km) => (
              <TouchableOpacity
                key={km}
                style={[
                  styles.radiusChip,
                  radiusKm === km && styles.radiusChipActive,
                ]}
                onPress={() => setRadiusKm(km)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.radiusChipText,
                    radiusKm === km && styles.radiusChipTextActive,
                  ]}
                >
                  {km} km
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      {/* ------------------------ */}

      {locationError ? (
        <Text style={styles.errorText}>{locationError}</Text>
      ) : isLoading ? (
        <ActivityIndicator
          size="large"
          color="#EB681E"
          style={{ marginTop: 20 }}
        />
      ) : isError ? (
        <Text style={styles.errorText}>
          Erro ao carregar o feed. Verifique sua conexão.
        </Text>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          numColumns={2} // 🔥 GRID DE 2 COLUNAS
          columnWrapperStyle={styles.rowWrapper} // 🔥 ESPAÇAMENTO ENTRE AS COLUNAS
          contentContainerStyle={{ paddingBottom: 80, paddingTop: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#EB681E"]} // Laranja
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/item/${item.id}`)}
              activeOpacity={0.9}
            >
              {item.imageUrls && item.imageUrls.length > 0 ? (
                <Image
                  source={{ uri: item.imageUrls[0] }}
                  style={styles.cardImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={24} color="#94A3B8" />
                </View>
              )}

              <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text>
                  </View>
                  {item.distance && (
                    <Text style={styles.distanceText}>
                      📍 {Math.round(item.distance / 1000)} km
                    </Text>
                  )}
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.donorText} numberOfLines={1}>De: {item.donor.fullName}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhuma doação encontrada.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  // 🔥 Header Padronizado
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#0F172A" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoutText: { color: "#DC2626", fontWeight: "bold", fontSize: 13 },

  // 🔥 Filtros
  filtersContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
  },
  searchInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
    color: "#0F172A",
  },
  scrollHorizontal: { marginBottom: 12 },
  chip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#EB681E" },
  chipText: { color: "#475569", fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#FFFFFF", fontWeight: "bold" },

  radiusContainer: { flexDirection: "row", alignItems: "center" },
  radiusLabel: {
    fontSize: 13,
    color: "#475569",
    marginRight: 10,
    fontWeight: "bold",
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
    backgroundColor: "#F8FAFC",
  },
  radiusChipActive: { backgroundColor: "#FFF3EB", borderColor: "#EB681E" },
  radiusChipText: { color: "#64748B", fontSize: 13 },
  radiusChipTextActive: { color: "#EB681E", fontWeight: "bold" },

  text: { marginTop: 10, color: "#64748B" },
  errorText: { color: "#DC2626", textAlign: "center", marginTop: 20, fontWeight: "bold" },
  emptyText: { textAlign: "center", color: "#94A3B8", marginTop: 40, fontSize: 15 },

  // 🔥 Estilos do GRID (2 Colunas)
  rowWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 4, // Espaçamento entre os dois cards da mesma linha
    overflow: "hidden",
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    maxWidth: '48%', // Garante que não estique bizarramente se houver número ímpar
  },
  cardImage: { width: "100%", height: 130, backgroundColor: "#E2E8F0" },
  imagePlaceholder: {
    width: "100%",
    height: 130,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { padding: 12 },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#FFF3EB",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 1,
  },
  categoryText: {
    color: "#EB681E",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  distanceText: { fontSize: 11, color: "#64748B", fontWeight: "600", marginLeft: 4 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
    lineHeight: 20,
  },
  donorText: { fontSize: 12, color: "#94A3B8" },
});