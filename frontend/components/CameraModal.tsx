import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  Platform,
  Alert,
  TextInput,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

type CaptureMode = 'photo' | 'video';

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: CaptureMode;
}

export default function CameraModal({ visible, onClose, initialMode = 'photo' }: CameraModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { familyId, childId } = useAuth();

  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showDictation, setShowDictation] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [useTextInput, setUseTextInput] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [audioPermission, requestAudioPermission] = Audio.usePermissions();

  const cameraRef = useRef<CameraView>(null);
  const slideAnim = useRef(new Animated.Value(400)).current;

  console.log('CameraModal render - visible:', visible);

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setCapturedMedia(null);
      setShowDictation(false);
      setVoiceText('');
      setUseTextInput(false);
      slideAnim.setValue(400);
    }
  }, [visible, initialMode]);

  useEffect(() => {
    if (showDictation) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [showDictation]);

  const handleClose = () => {
    console.log('=== HANDLE CLOSE CALLED ===');
    // Reset all state
    setCapturedMedia(null);
    setShowDictation(false);
    setVoiceText('');
    setIsListening(false);
    setUseTextInput(false);
    setMode(initialMode);
    setIsRecording(false);
    // Close the modal
    onClose();
  };

  const requestPermissions = async () => {
    const camStatus = await requestCameraPermission();
    const audStatus = await requestAudioPermission();
    return camStatus?.granted && audStatus?.granted;
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      setCapturedMedia(photo.uri);
      setTimeout(() => setShowDictation(true), 300);
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const startVideoRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });
      setIsRecording(false);
      setCapturedMedia(video.uri);
      setTimeout(() => setShowDictation(true), 300);
    } catch (error: any) {
      console.error('Error recording video:', error);
      setIsRecording(false);

      // Check if it's a simulator error
      if (error?.message?.includes('simulator') || error?.message?.includes('not supported')) {
        Alert.alert(
          'Simulator Limitation',
          'Video recording is not supported on iOS Simulator. Please use a physical device or take photos instead.',
          [{ text: 'OK', onPress: () => setMode('photo') }]
        );
      } else {
        Alert.alert('Error', 'Failed to record video. Please try again.');
      }
    }
  };

  const stopVideoRecording = async () => {
    if (!cameraRef.current) return;

    try {
      cameraRef.current.stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleCapture = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      Alert.alert('Permissions Required', 'Camera and microphone access are needed');
      return;
    }

    if (mode === 'photo') {
      await takePicture();
    } else if (mode === 'video') {
      if (isRecording) {
        await stopVideoRecording();
      } else {
        await startVideoRecording();
      }
    }
  };

  const startVoiceDictation = () => {
    setIsListening(true);
    // Simulated voice input - in production, use speech-to-text API
    setTimeout(() => {
      setVoiceText('The kids found a hidden trail behind the cabin. Leo spotted a deer for the first time!');
      setIsListening(false);
    }, 2000);
  };

  const saveMemory = async () => {
    if (!voiceText.trim()) {
      Alert.alert('Add Description', 'Please describe what happened today');
      return;
    }

    if (!capturedMedia || !familyId || !childId) {
      Alert.alert('Error', 'Missing required data');
      return;
    }

    try {
      setSaving(true);

      // 1. Get presigned upload URL
      const fileExt = mode === 'photo' ? 'jpg' : 'mp4';
      const mimeType = mode === 'photo' ? 'image/jpeg' : 'video/mp4';
      const fileName = `memory_${Date.now()}.${fileExt}`;

      const presignedRes = await api.post('/api/upload/presigned-url', {
        fileName,
        fileType: mimeType,
        folder: 'memories',
      });

      if (!presignedRes.success || !presignedRes.data) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileUrl } = presignedRes.data;

      // 2. Upload file to S3
      const fileResponse = await fetch(capturedMedia);
      const fileBlob = await fileResponse.blob();

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: fileBlob,
      });

      // 3. Create memory in backend
      const memoryRes = await api.post('/api/memories', {
        familyId,
        childId,
        mediaUrl: fileUrl,
        mediaType: mode === 'photo' ? 'photo' : 'video',
        caption: voiceText.trim(),
        date: new Date().toISOString(),
      });

      if (memoryRes.success) {
        Alert.alert('Success!', 'Memory saved successfully', [
          { text: 'OK', onPress: handleClose },
        ]);
      } else {
        throw new Error(memoryRes.error || 'Failed to save memory');
      }
    } catch (error: any) {
      console.error('Save memory error:', error);
      Alert.alert('Error', error.message || 'Failed to save memory. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!cameraPermission) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
      transparent={false}
    >
      <View style={styles.container}>
        {/* Camera/Preview View */}
        {!capturedMedia ? (
          <View style={{ flex: 1 }} pointerEvents="box-none">
            {/* Camera View */}
            <View style={{ flex: 1 }}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
              >
                  {isRecording && mode === 'video' && (
                    <View style={styles.recordingIndicator}>
                      <View style={styles.recordingDot} />
                      <Text style={styles.recordingText}>REC</Text>
                    </View>
                  )}
              </CameraView>
            </View>

            {/* Top Bar Controls - Sibling to camera, not child */}
            <View style={styles.topBarAbsolute}>
              <View style={styles.topBarRow}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    console.log('CLOSE BUTTON TAPPED!');
                    handleClose();
                  }}
                  onPressIn={() => console.log('CLOSE PRESSED IN')}
                  onPressOut={() => console.log('CLOSE PRESSED OUT')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <MaterialIcons name="close" size={28} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.flipButton}
                  onPress={() => {
                    console.log('FLIP BUTTON TAPPED');
                    setFacing(facing === 'back' ? 'front' : 'back');
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <MaterialIcons name="flip-camera-ios" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Controls */}
            <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
              {/* Mode Selector */}
              <View style={styles.modeSelector}>
                <TouchableOpacity
                  style={[
                    styles.modeChip,
                    mode === 'photo' && {
                      backgroundColor: 'rgba(255,255,255,0.3)',
                    },
                  ]}
                  onPress={() => setMode('photo')}
                >
                  <Text style={[styles.modeText, mode === 'photo' && styles.modeTextActive]}>
                    PHOTO
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeChip,
                    mode === 'video' && {
                      backgroundColor: 'rgba(255,255,255,0.3)',
                    },
                  ]}
                  onPress={() => setMode('video')}
                >
                  <Text style={[styles.modeText, mode === 'video' && styles.modeTextActive]}>
                    VIDEO
                  </Text>
                </TouchableOpacity>

              </View>

              {/* Capture Button */}
              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleCapture}
                activeOpacity={0.8}
              >
                <View style={styles.captureOuter}>
                  <View style={[
                    styles.captureInner,
                    isRecording && styles.captureInnerRecording,
                  ]} />
                </View>
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        ) : (
          <>
            {/* Preview with Blurred Background */}
            <View style={styles.previewContainer}>
              {/* Blurred Background Image */}
              <Image
                source={{ uri: capturedMedia }}
                style={styles.backgroundImage}
                blurRadius={20}
              />
              <View style={styles.darkOverlay} />

              {/* Top Bar */}
              <SafeAreaView edges={['top']} style={styles.previewTopBar}>
                <TouchableOpacity
                  style={styles.whiteButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.newMemoryBadge}>
                  <Text style={styles.newMemoryText}>NEW MEMORY</Text>
                </View>

                <TouchableOpacity style={styles.whiteButton} activeOpacity={0.7}>
                  <MaterialIcons name="more-vert" size={24} color="#fff" />
                </TouchableOpacity>
              </SafeAreaView>

              {/* Dictation Bottom Sheet */}
              {showDictation && (
                <Animated.View
                  style={[
                    styles.bottomSheet,
                    {
                      transform: [{ translateY: slideAnim }],
                      backgroundColor: colorScheme === 'dark' ? colors.background : colors.surface,
                    },
                  ]}
                >
                  {/* Handle */}
                  <View style={styles.sheetHandle} />

                  {/* Content */}
                  <View style={styles.sheetContent}>
                    <Text style={[styles.metaText, { color: colors.primary }]}>
                      TELL THE STORY
                    </Text>
                    <Text style={[styles.headlineText, { color: colors.text }]}>
                      What happened{'\n'}today?
                    </Text>

                    {/* Waveform or Text Input */}
                    {!useTextInput ? (
                      <>
                        {/* Waveform Visualizer */}
                        {isListening && (
                          <View style={styles.waveformContainer}>
                            {[...Array(7)].map((_, i) => (
                              <View
                                key={i}
                                style={[
                                  styles.waveformBar,
                                  { backgroundColor: colors.primary },
                                ]}
                              />
                            ))}
                          </View>
                        )}

                        {/* Transcript Preview */}
                        {voiceText ? (
                          <View style={[styles.transcriptBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}>
                            <Text style={[styles.transcriptText, { color: colors.text }]}>
                              "{voiceText}"
                            </Text>
                            <TouchableOpacity style={styles.editButton}>
                              <MaterialIcons name="edit" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.emptyTranscript}>
                            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                              {isListening ? 'Listening...' : 'Tap the mic to start speaking'}
                            </Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <TextInput
                        style={[styles.textInput, { color: colors.text, backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                        placeholder="Type what happened..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        value={voiceText}
                        onChangeText={setVoiceText}
                        autoFocus
                      />
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
                        onPress={saveMemory}
                        activeOpacity={0.9}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <View style={styles.saveIconContainer}>
                              <ActivityIndicator color="#fff" size="small" />
                            </View>
                            <Text style={styles.saveButtonText}>Uploading...</Text>
                            <View style={styles.arrowContainer}>
                              <ActivityIndicator color={colors.primary} size="small" />
                            </View>
                          </>
                        ) : (
                          <>
                            <View style={styles.saveIconContainer}>
                              <MaterialIcons name={useTextInput ? 'edit' : 'mic'} size={24} color="#fff" />
                            </View>
                            <Text style={styles.saveButtonText}>Save Memory</Text>
                            <View style={styles.arrowContainer}>
                              <MaterialIcons name="arrow-upward" size={24} color={colors.primary} />
                            </View>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => {
                        if (useTextInput) {
                          setUseTextInput(false);
                          setVoiceText('');
                        } else {
                          if (!isListening && !voiceText) {
                            startVoiceDictation();
                          } else {
                            setUseTextInput(true);
                          }
                        }
                      }}>
                        <Text style={[styles.secondaryButton, { color: colors.textSecondary }]}>
                          {useTextInput ? 'Use voice instead' : voiceText ? 'Edit text' : 'Type text instead'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              )}
            </View>
          </>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 999,
  },
  topBarSafeArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  absoluteTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topBarAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999999,
    elevation: 999999,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 80,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  recordingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  audioView: {
    flex: 1,
  },
  audioContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  audioIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  audioSubtitle: {
    fontSize: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 32,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 6,
    borderRadius: 24,
  },
  modeChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 18,
  },
  modeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  modeTextActive: {
    color: '#fff',
  },
  captureButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  captureInnerRecording: {
    borderRadius: 8,
    width: 32,
    height: 32,
    backgroundColor: '#ff0000',
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  darkOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  whiteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newMemoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  newMemoryText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHandle: {
    width: 48,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
  },
  sheetContent: {
    padding: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  headlineText: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    width: '100%',
  },
  waveformBar: {
    width: 6,
    height: '30%',
    borderRadius: 3,
  },
  transcriptBox: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 32,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  editButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTranscript: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
  },
  textInput: {
    width: '100%',
    minHeight: 120,
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 32,
    textAlignVertical: 'top',
  },
  actionButtons: {
    width: '100%',
    gap: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    borderRadius: 32,
    paddingHorizontal: 8,
    shadowColor: '#ee8c2b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  arrowContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
