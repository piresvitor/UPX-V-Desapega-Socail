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
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
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
          page: 1, // Base para o Infinite Scroll no futuro
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
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.text}>
          Buscando sua localização via satélite...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          style={[styles.searchInput, { color: "#000000" }]} // Força texto preto
          placeholder="Buscar itens..."
          placeholderTextColor="#9CA3AF" // Força o placeholder cinza
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
          color="#4CAF50"
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
          contentContainerStyle={{ paddingBottom: 20 }}
          // Pull-to-refresh nativo
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2196F3"]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/item/${item.id}`)}
            >
              {item.imageUrls && item.imageUrls.length > 0 ? (
                <Image
                  source={{ uri: item.imageUrls[0] }}
                  style={styles.cardImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={{ color: "#999" }}>Sem foto</Text>
                </View>
              )}

              <View style={styles.cardContent}>
                <View style={styles.rowBetween}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                  </View>
                  {/* Exibindo a distância que vem do PostGIS */}
                  {item.distance && (
                    <Text style={styles.distanceText}>
                      📍 {Math.round(item.distance / 1000)} km
                    </Text>
                  )}
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.donorText}>Por: {item.donor.fullName}</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: { fontSize: 26, fontWeight: "bold", color: "#111827" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  logoutText: { color: "#DC2626", fontWeight: "bold", fontSize: 14 },

  // Filtros
  filtersContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 4,
  },
  searchInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: "#111827",
  },
  scrollHorizontal: { marginBottom: 12 },
  chip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#2563EB" },
  chipText: { color: "#475569", fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },

  radiusContainer: { flexDirection: "row", alignItems: "center" },
  radiusLabel: {
    fontSize: 14,
    color: "#64748B",
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
  radiusChipActive: { backgroundColor: "#E0F2FE", borderColor: "#2563EB" },
  radiusChipText: { color: "#475569" },
  radiusChipTextActive: { color: "#2563EB", fontWeight: "bold" },

  text: { marginTop: 10, color: "#64748B" },
  errorText: { color: "#DC2626", textAlign: "center", marginTop: 20 },
  emptyText: { textAlign: "center", color: "#64748B", marginTop: 40 },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardImage: { width: "100%", height: 180, backgroundColor: "#E5E7EB" },
  imagePlaceholder: {
    width: "100%",
    height: 180,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { padding: 20 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  distanceText: { fontSize: 12, color: "#64748B", fontWeight: "bold" },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  donorText: { fontSize: 14, color: "#64748B" },
});
