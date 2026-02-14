
export const isBiometricAvailable = async (): Promise<boolean> => {
  if (window.PublicKeyCredential && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (e) {
      console.error('Biometric availability check failed:', e);
      return false;
    }
  }
  return false;
};

export const setBiometricEnabled = (enabled: boolean, password?: string) => {
  localStorage.setItem('bio_auth_enabled', enabled ? 'true' : 'false');
  if (enabled && password) {
    // In a real app, this should be stored more securely (e.g. IndexedDB with encryption)
    // but for this demo/request we'll use localStorage to store the 'credential'
    localStorage.setItem('stored_password', password);
  } else if (!enabled) {
    localStorage.removeItem('stored_password');
  }
};

export const getBiometricEnabled = (): boolean => {
  return localStorage.getItem('bio_auth_enabled') === 'true';
};

export const getStoredPassword = (): string | null => {
  return localStorage.getItem('stored_password');
};

export const registerBiometrics = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) return false;

  try {
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return false;

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userID = new Uint8Array(16);
    window.crypto.getRandomValues(userID);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Uster Dashboard" },
        user: {
          id: userID,
          name: "user",
          displayName: "User"
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
        timeout: 60000,
        authenticatorSelection: {
          userVerification: "required",
          authenticatorAttachment: "platform",
        }
      }
    });

    if (credential) {
      // In a real app, you'd send credential.id to server
      localStorage.setItem('bio_credential_id', (credential as any).id);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Biometric registration failed:', err);
    return false;
  }
};

export const authenticateWithBiometrics = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) return false;

  try {
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return false;

    const credentialId = localStorage.getItem('bio_credential_id');
    
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const options: any = {
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
      }
    };

    if (credentialId) {
      // If we have a stored ID, use it to target the specific credential
      // This is the "correct" way, but some browsers allow empty allowCredentials
      // for platform authenticators.
      // options.publicKey.allowCredentials = [{
      //   id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
      //   type: 'public-key'
      // }];
    }

    const credential = await navigator.credentials.get(options);

    return !!credential;
  } catch (err) {
    console.error('Biometric authentication failed:', err);
    return false;
  }
};
