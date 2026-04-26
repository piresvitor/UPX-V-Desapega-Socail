import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, 
  Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { api } from '../../src/services/api';

// --- CONFIGURAÇÃO E IMPORTS DO FIREBASE ---
import { initializeApp, getApps, getApp } from 'firebase/app'; 
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || ("AIzaSyBsedK_" + "UIlyf5XsrsAkBIv5S8_JhePQo9s"), 
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "desapegasocial-89475.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "desapegasocial-89475",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "desapegasocial-89475.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "35042250010",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:35042250010:web:22c0cda15940e4382970a3"
};

if (!process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET) {
  console.error("ALERTA CRÍTICO: O Expo não conseguiu ler o seu arquivo .env!");
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const bucketUrl = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET 
  ? `gs://${process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET}` 
  : undefined;

const storage = getStorage(app, bucketUrl);

const CATEGORIES = ['Móveis', 'Eletrônicos', 'Roupas', 'Alimentos', 'Outros'];

export default function CreateDonationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleAddImage = async () => {
    if (images.length >= 3) {
      return Alert.alert('Limite atingido', 'Você pode adicionar no máximo 3 fotos.');
    }

    Alert.alert('Adicionar Foto', 'Escolha a origem da imagem:', [
      { text: 'Câmera', onPress: pickFromCamera },
      { text: 'Galeria', onPress: pickFromGallery },
      { text: 'Cancelar', style: 'cancel' }
    ]);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, 
    });
    if (!result.canceled) setImages([...images, result.assets[0].uri]);
  };

  const pickFromCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permissão negada', 'Precisamos de acesso à câmera para tirar fotos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setImages([...images, result.assets[0].uri]);
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const uploadImagesToFirebase = async (uris: string[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < uris.length; i++) {
       const uri = uris[i];
       
       try {
         const response = await fetch(uri);
         const blob = await response.blob();
         
         const filename = `doacoes/item-${Date.now()}-${i}.jpg`;
         const storageRef = ref(storage, filename);
         
         const metadata = { contentType: 'image/jpeg' };
         
         await uploadBytes(storageRef, blob, metadata);
         
         const downloadURL = await getDownloadURL(storageRef);
         uploadedUrls.push(downloadURL);
         
       } catch (uploadError: any) {
         console.error("ERRO REAL DO FIREBASE:", uploadError);
         Alert.alert("Detalhes do Erro", uploadError?.message || "Erro desconhecido ao enviar foto.");
         throw new Error("Falha no upload");
       }
    }
    return uploadedUrls;
  };

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => await api.post('/items', data),
    onSuccess: () => {
      Alert.alert('Sucesso!', 'Sua doação foi publicada.');
      queryClient.invalidateQueries({ queryKey: ['items'] }); 
      queryClient.invalidateQueries({ queryKey: ['items', 'me'] }); 
      
      setTitle(''); setDescription(''); setCategory(''); setImages([]);
      router.push('/(tabs)/home'); 
    },
    onError: () => Alert.alert('Erro', 'Não foi possível publicar a doação no banco de dados.')
  });

  const handleSubmit = async () => {
    if (!title.trim() || !category) {
      return Alert.alert('Atenção', 'Título e Categoria são obrigatórios.');
    }
    if (images.length === 0) {
      return Alert.alert('Atenção', 'Adicione pelo menos 1 foto do item.');
    }

    setIsUploading(true);

    try {
      let latitude = -23.501533;  
      let longitude = -47.458112; 

      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        }
      } catch (locationError) {
        console.warn('GPS indisponível no momento. Usando coordenadas de fallback.', locationError);
      }

      const imageUrls = await uploadImagesToFirebase(images);

      createItemMutation.mutate({
        title,
        description,
        category,
        imageUrls,
        latitude,
        longitude
      });

    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Ocorreu um erro no processamento da doação. Verifique sua conexão.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nova Doação</Text>
          <Text style={styles.headerSub}>Preencha os dados e ajude quem precisa.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Fotos do Item (Até 3)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imagePreviewContainer}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImgBtn} onPress={() => removeImage(index)}>
                  <Text style={styles.removeImgText}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            {images.length < 3 && (
              <TouchableOpacity style={styles.addImgBtn} onPress={handleAddImage}>
                <Text style={styles.addImgPlus}>+</Text>
                <Text style={styles.addImgLabel}>Adicionar</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Título</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Cadeira de Banho em bom estado" 
            placeholderTextColor="#9CA3AF"
            value={title} onChangeText={setTitle} maxLength={100} 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Regras para retirada, detalhes de conservação..." 
            placeholderTextColor="#9CA3AF"
            value={description} onChangeText={setDescription} 
            multiline numberOfLines={4} textAlignVertical="top" 
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, (isUploading || createItemMutation.isPending) && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={isUploading || createItemMutation.isPending}
        >
          {isUploading || createItemMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.submitBtnText}>Publicar Doação</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 20, paddingBottom: 80 },
  
  header: { marginBottom: 25 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 15, color: '#6B7280', marginTop: 5 },

  section: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
  
  imageScroll: { flexDirection: 'row', paddingBottom: 5 },
  addImgBtn: { width: 100, height: 100, backgroundColor: '#E5E7EB', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed' },
  addImgPlus: { fontSize: 32, color: '#9CA3AF', fontWeight: '300' },
  addImgLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  imagePreviewContainer: { marginRight: 15, position: 'relative' },
  imagePreview: { width: 100, height: 100, borderRadius: 12 },
  removeImgBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  removeImgText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, color: '#1F2937' },
  textArea: { minHeight: 100, paddingTop: 14 },
  
  categoryScroll: { flexDirection: 'row' },
  chip: { backgroundColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
  chipActive: { backgroundColor: '#2196F3' },
  chipText: { color: '#6B7280', fontWeight: 'bold' },
  chipTextActive: { color: '#FFF' },

  submitBtn: { backgroundColor: '#FF9800', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 2 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 }
});