import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../../../services/firebase.js';
import {
  PatientRegistrationData,
  CaregiverRegistrationData,
  DoctorRegistrationData,
  AuthUser
} from '../types/auth.types.js';

export class RegistrationService {
  /**
   * Register Patient
   * Creates Firebase user + Firestore profile with status 'verified'.
   */
  public static async registerPatient(data: PatientRegistrationData): Promise<AuthUser> {
    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const cleanEmail = data.email.trim().toLowerCase();

    if (isFirebaseConfigured) {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: data.fullName });

      // Save core user document with role: 'patient'
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: cleanEmail,
        displayName: data.fullName,
        role: 'patient',
        status: 'verified',
        phoneNumber: data.phoneNumber || '',
        createdAt: serverTimestamp()
      });

      // Save patient medical profile
      await setDoc(doc(db, 'patients', user.uid), {
        patientId: user.uid,
        preferredName: data.preferredName || data.fullName,
        emergencyContact: {
          name: data.emergencyContactName,
          phoneNumber: data.emergencyContactPhone
        },
        companionSettings: {
          characterId: data.companionChoice || 'asha',
          voiceSpeed: 1.0,
          autoSpeechOutput: true
        },
        createdAt: serverTimestamp()
      });

      return {
        uid: user.uid,
        email: cleanEmail,
        displayName: data.fullName,
        role: 'patient',
        status: 'verified',
        phoneNumber: data.phoneNumber
      };
    }

    // Local simulated registration
    const simulatedUser: AuthUser = {
      uid: `local-pat-${Date.now()}`,
      email: cleanEmail,
      displayName: data.fullName,
      role: 'patient',
      status: 'verified',
      phoneNumber: data.phoneNumber
    };
    localStorage.setItem('saksham_auth_user', JSON.stringify(simulatedUser));
    return simulatedUser;
  }

  /**
   * Register Caregiver
   * Crucial rule: Caregiver registration must not automatically grant access to patient records!
   */
  public static async registerCaregiver(data: CaregiverRegistrationData): Promise<AuthUser> {
    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const cleanEmail = data.email.trim().toLowerCase();

    if (isFirebaseConfigured) {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: data.fullName });

      // Save core user document
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: cleanEmail,
        displayName: data.fullName,
        role: 'caregiver',
        status: 'verified',
        phoneNumber: data.phoneNumber,
        createdAt: serverTimestamp()
      });

      // Save caregiver record
      await setDoc(doc(db, 'caregivers', user.uid), {
        caregiverId: user.uid,
        displayName: data.fullName,
        relationshipToPatient: data.relationshipToPatient,
        phoneNumber: data.phoneNumber,
        invitationCodeEntered: data.patientInvitationCode || null,
        createdAt: serverTimestamp()
      });

      return {
        uid: user.uid,
        email: cleanEmail,
        displayName: data.fullName,
        role: 'caregiver',
        status: 'verified',
        phoneNumber: data.phoneNumber,
        invitationCode: data.patientInvitationCode
      };
    }

    // Local simulated registration
    const simulatedUser: AuthUser = {
      uid: `local-cg-${Date.now()}`,
      email: cleanEmail,
      displayName: data.fullName,
      role: 'caregiver',
      status: 'verified',
      phoneNumber: data.phoneNumber,
      invitationCode: data.patientInvitationCode
    };
    localStorage.setItem('saksham_auth_user', JSON.stringify(simulatedUser));
    return simulatedUser;
  }

  /**
   * Register Doctor Application
   * Crucial rule: New doctor accounts must remain PENDING until professional verification
   * and administrator approval are complete!
   */
  public static async registerDoctor(data: DoctorRegistrationData): Promise<AuthUser> {
    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match.');
    }
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (!data.licenseNumber || !data.specialty) {
      throw new Error('Medical license number and medical specialty are mandatory.');
    }

    const cleanEmail = data.email.trim().toLowerCase();

    if (isFirebaseConfigured) {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: `Dr. ${data.fullName}` });

      // Note: role: 'doctor', status: 'pending' (strict security mandate)
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: cleanEmail,
        displayName: `Dr. ${data.fullName}`,
        role: 'doctor',
        status: 'pending',
        licenseNumber: data.licenseNumber,
        specialty: data.specialty,
        hospital: data.hospitalAffiliation,
        phoneNumber: data.phoneNumber,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'doctors', user.uid), {
        doctorId: user.uid,
        displayName: `Dr. ${data.fullName}`,
        licenseNumber: data.licenseNumber,
        specialty: data.specialty,
        hospitalAffiliation: data.hospitalAffiliation,
        verificationStatus: 'pending_review',
        createdAt: serverTimestamp()
      });

      return {
        uid: user.uid,
        email: cleanEmail,
        displayName: `Dr. ${data.fullName}`,
        role: 'doctor',
        status: 'pending',
        licenseNumber: data.licenseNumber,
        specialty: data.specialty,
        hospital: data.hospitalAffiliation
      };
    }

    // Local simulated registration
    const simulatedUser: AuthUser = {
      uid: `local-doc-${Date.now()}`,
      email: cleanEmail,
      displayName: `Dr. ${data.fullName}`,
      role: 'doctor',
      status: 'pending',
      licenseNumber: data.licenseNumber,
      specialty: data.specialty,
      hospital: data.hospitalAffiliation
    };
    // Do NOT store in active login session because it is pending
    return simulatedUser;
  }
}
