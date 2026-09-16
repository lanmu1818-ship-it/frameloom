// Modified for standalone community distribution; see NOTICE.
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ArrowLeft, Download, Eye, EyeOff, Loader2, X } from "lucide-react";
import { apiFetch } from "@/src/client/api";
import {
  chooseLocalArchiveDirectory,
  getDesktopArchiveBridge,
} from "@/src/client/local-media-archive";
import {
  runScheduledLocalArchiveSync,
  startLocalMediaArchiveScheduler,
} from "@/src/client/local-media-archive-scheduler";
import {
  getLocalMediaArchiveRuntimeConfig,
  saveLocalMediaArchiveRuntimeConfig,
  type LocalMediaArchiveRuntimeConfig,
} from "@/src/runtime/local-media-archive-config";
import {
  getPublicApiRuntimeConfig,
  normalizePublicApiRuntimeConfig,
} from "@/src/runtime/public-api-config";
import {
  completeDesktopClerkRegistration,
  completeDesktopClerkOAuth,
  hasPendingDesktopClerkRedirect,
  startDesktopBrowserRegistration,
  startDesktopClerkOAuth,
  type DesktopClerkAuthConfig,
} from "@/src/desktop/desktop-clerk-oauth";
import { DesktopFrontendApp } from "@/src/desktop/desktop-frontend-app";
import { CanvasLogoLoadingView } from "@/src/components/canvas/canvas-logo-loading";
import loginHeroImageUrl from "@/public/placeholders/preview.svg";
import brandMarkUrl from "@/public/brand/yedier-favicon.svg";

const loginHeroImageAsset = loginHeroImageUrl as unknown as
  | string
  | { src?: string };
const LOGIN_HERO_IMAGE_SRC =
  typeof loginHeroImageAsset === "string"
    ? loginHeroImageAsset
    : String(loginHeroImageAsset.src || "");

type AppView = "boot" | "auth" | "workspace";
type AuthMode = "login" | "register";
type RegisterMode = "personal" | "create_team" | "join_team";
type SocialProvider = "google" | "apple";

const REGISTRATION_PASSWORD_REQUIREMENT_MESSAGE =
  "密码至少 8 位，且同时包含大写字母、小写字母、数字和特殊符号。";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  teamId?: string | null;
  teamRole?: string | null;
};

type CanvasProject = {
  id: string;
  title?: string | null;
  updatedAt?: string | null;
  workspaceType?: string | null;
};

type ValidateSessionResponse = {
  valid?: boolean;
  user?: SessionUser | null;
};

type CanvasListResponse = {
  success?: boolean;
  data?: CanvasProject[];
  error?: string;
};

type CanvasCreateResponse = {
  success?: boolean;
  data?: CanvasProject;
  error?: string;
};

type AuthResponse = {
  success?: boolean;
  error?: string;
  status?: string;
  user?: SessionUser | null;
  cooldownSeconds?: number;
  expiresInMinutes?: number;
  message?: string;
};

type AuthSettingsResponse = {
  clerk?: DesktopClerkAuthConfig;
  isAppleConfigured?: boolean;
  isAppleEnabled?: boolean;
  isGoogleConfigured?: boolean;
  isGoogleEnabled?: boolean;
};

type SocialAuthState = {
  appleConfigured: boolean;
  appleEnabled: boolean;
  clerk: DesktopClerkAuthConfig | null;
  googleConfigured: boolean;
  googleEnabled: boolean;
};

type PendingSocialRegistration = {
  clerkToken: string;
  provider: SocialProvider;
};

type LocalArchiveScheduledSyncResult = Awaited<
  ReturnType<typeof runScheduledLocalArchiveSync>
>;

type DesktopUpdateResult = {
  artifact?: {
    fileName?: string;
  } | null;
  downloaded?: boolean;
  installed?: boolean;
  latestVersion?: string;
  notes?: string;
  reason?: string;
  readyToInstall?: boolean;
  updateAvailable?: boolean;
};

type DesktopUpdateProgress = {
  artifact?: {
    fileName?: string;
    size?: number;
  } | null;
  latestVersion?: string;
  percent?: number;
  phase?: string;
  reason?: string;
  receivedBytes?: number;
  totalBytes?: number;
};

type DesktopUpdateBridge = {
  checkForUpdate?: () => Promise<DesktopUpdateResult>;
  downloadUpdate?: () => Promise<DesktopUpdateResult>;
  installDownloadedUpdate?: () => Promise<DesktopUpdateResult>;
  installUpdate?: () => Promise<DesktopUpdateResult>;
  onProgress?: (callback: (progress: DesktopUpdateProgress) => void) => () => void;
};

type DesktopUpdateState = {
  artifactName: string;
  checking: boolean;
  downloadPercent: number;
  downloaded: boolean;
  downloading: boolean;
  dismissedVersion: string;
  installing: boolean;
  latestVersion: string;
  message: string;
  notes: string;
  readyToInstall: boolean;
  restartDialogVisible: boolean;
  totalBytes: number;
  visible: boolean;
};

declare global {
  interface Window {
    __YEDIR_DESKTOP_UPDATES__?: DesktopUpdateBridge;
  }
}

export function DesktopRendererApp() {
  const [view, setView] = useState<AppView>("boot");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [projects, setProjects] = useState<CanvasProject[]>([]);
  const [archiveConfig, setArchiveConfig] =
    useState<LocalMediaArchiveRuntimeConfig>(() =>
      getLocalMediaArchiveRuntimeConfig()
    );
  const [archiveMessage, setArchiveMessage] = useState("");
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [isSendingResetCode, setIsSendingResetCode] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetCodeCooldown, setResetCodeCooldown] = useState(0);
  const [registerMode, setRegisterMode] = useState<RegisterMode>("personal");
  const [registerTeamName, setRegisterTeamName] = useState("");
  const [registerInviteCode, setRegisterInviteCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [clerkVerificationPending, setClerkVerificationPending] =
    useState(false);
  const [registrationCodeCooldown, setRegistrationCodeCooldown] = useState(0);
  const [isSendingRegistrationCode, setIsSendingRegistrationCode] =
    useState(false);
  const [socialAuth, setSocialAuth] = useState<SocialAuthState>({
    appleConfigured: false,
    appleEnabled: false,
    clerk: null,
    googleConfigured: false,
    googleEnabled: false,
  });
  const [pendingSocialRegistration, setPendingSocialRegistration] =
    useState<PendingSocialRegistration | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("正在检查桌面端配置...");
  const [desktopUpdate, setDesktopUpdate] = useState<DesktopUpdateState>({
    artifactName: "",
    checking: false,
    downloadPercent: 0,
    downloaded: false,
    downloading: false,
    dismissedVersion: "",
    installing: false,
    latestVersion: "",
    message: "",
    notes: "",
    readyToInstall: false,
    restartDialogVisible: false,
    totalBytes: 0,
    visible: false,
  });

  useEffect(() => {
    if (resetCodeCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResetCodeCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resetCodeCooldown]);

  useEffect(() => {
    if (registrationCodeCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRegistrationCodeCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [registrationCodeCooldown]);

  const checkDesktopUpdate = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const bridge = getDesktopUpdateBridge();
      if (typeof bridge?.checkForUpdate !== "function") {
        return;
      }

      setDesktopUpdate((current) => ({
        ...current,
        checking: true,
        message: options.silent ? current.message : "正在检查更新...",
      }));

      try {
        const result = await bridge.checkForUpdate();
        const latestVersion = normalizeDesktopUpdateString(
          result?.latestVersion
        );

        if (result?.updateAvailable === true && latestVersion) {
          setDesktopUpdate((current) => ({
            ...current,
            artifactName: normalizeDesktopUpdateString(
              result.artifact?.fileName
            ),
            checking: false,
            downloadPercent: 0,
            downloaded: false,
            downloading: false,
            installing: false,
            latestVersion,
            message: "",
            notes: normalizeDesktopUpdateString(result.notes),
            readyToInstall: false,
            restartDialogVisible: false,
            totalBytes: 0,
            visible: current.dismissedVersion !== latestVersion,
          }));
          return;
        }

        setDesktopUpdate((current) => ({
          ...current,
          checking: false,
          message: options.silent ? current.message : "当前已是最新版本。",
          visible: false,
        }));
      } catch {
        setDesktopUpdate((current) => ({
          ...current,
          checking: false,
          message: options.silent ? current.message : "更新检查失败。",
        }));
      }
    },
    []
  );

  const handleDownloadDesktopUpdate = useCallback(async () => {
    const bridge = getDesktopUpdateBridge();
    if (
      typeof bridge?.downloadUpdate !== "function" &&
      typeof bridge?.installUpdate !== "function"
    ) {
      setDesktopUpdate((current) => ({
        ...current,
        message: "当前桌面壳不支持 App 内更新。",
      }));
      return;
    }

    setDesktopUpdate((current) => ({
      ...current,
      downloadPercent: current.downloadPercent || 0,
      downloading: true,
      message: "正在 App 内下载安装包...",
    }));

    try {
      const result =
        typeof bridge.downloadUpdate === "function"
          ? await bridge.downloadUpdate()
          : await bridge.installUpdate?.();
      const isReadyToInstall =
        result?.readyToInstall === true || result?.downloaded === true;
      setDesktopUpdate((current) => ({
        ...current,
        downloaded: isReadyToInstall,
        downloading: false,
        downloadPercent: isReadyToInstall ? 100 : current.downloadPercent,
        installing: false,
        message:
          isReadyToInstall
            ? "下载完成，可以立即重启更新。"
            : result?.installed === true
              ? "安装程序已启动。"
              : "没有可下载的新版本。",
        readyToInstall: isReadyToInstall,
        restartDialogVisible: isReadyToInstall,
        visible: result?.installed === true ? false : current.visible,
      }));
    } catch {
      setDesktopUpdate((current) => ({
        ...current,
        downloading: false,
        message: "更新下载安装失败，请稍后重试。",
      }));
    }
  }, []);

  const handleInstallDownloadedDesktopUpdate = useCallback(async () => {
    const bridge = getDesktopUpdateBridge();
    if (
      typeof bridge?.installDownloadedUpdate !== "function" &&
      typeof bridge?.installUpdate !== "function"
    ) {
      setDesktopUpdate((current) => ({
        ...current,
        message: "当前桌面壳不支持重启安装。",
      }));
      return;
    }

    setDesktopUpdate((current) => ({
      ...current,
      installing: true,
      message: "正在启动安装程序...",
    }));

    try {
      const result =
        typeof bridge.installDownloadedUpdate === "function"
          ? await bridge.installDownloadedUpdate()
          : await bridge.installUpdate?.();
      setDesktopUpdate((current) => ({
        ...current,
        installing: false,
        message:
          result?.installed === true
            ? "安装程序已启动，应用即将退出。"
            : "没有可安装的新版本。",
        restartDialogVisible:
          result?.installed === true ? false : current.restartDialogVisible,
        visible: result?.installed === true ? false : current.visible,
      }));
    } catch {
      setDesktopUpdate((current) => ({
        ...current,
        installing: false,
        message: "启动安装程序失败，请稍后重试。",
      }));
    }
  }, []);

  const handlePostponeDownloadedDesktopUpdate = useCallback(() => {
    setDesktopUpdate((current) => ({
      ...current,
      restartDialogVisible: false,
      visible: true,
    }));
  }, []);

  const handleDismissDesktopUpdate = useCallback(() => {
    setDesktopUpdate((current) => ({
      ...current,
      dismissedVersion: current.latestVersion,
      restartDialogVisible: false,
      visible: false,
    }));
  }, []);

  useEffect(() => {
    const bridge = getDesktopUpdateBridge();
    if (typeof bridge?.checkForUpdate !== "function") {
      return;
    }

    const timer = window.setTimeout(() => {
      void checkDesktopUpdate({ silent: true });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [checkDesktopUpdate]);

  useEffect(() => {
    const bridge = getDesktopUpdateBridge();
    if (typeof bridge?.onProgress !== "function") {
      return;
    }

    return bridge.onProgress((progress) => {
      setDesktopUpdate((current) => {
        const latestVersion =
          normalizeDesktopUpdateString(progress.latestVersion) ||
          current.latestVersion;
        const artifactName =
          normalizeDesktopUpdateString(progress.artifact?.fileName) ||
          current.artifactName;
        const percent = Math.max(
          0,
          Math.min(100, Math.round(Number(progress.percent) || 0))
        );
        const phase = normalizeDesktopUpdateString(progress.phase);

        return {
          ...current,
          artifactName,
          downloadPercent: percent,
          downloaded:
            phase === "ready" || phase === "downloaded" || current.downloaded,
          downloading:
            phase === "started" || phase === "downloading"
              ? true
              : phase === "ready" || phase === "downloaded" || phase === "failed"
                ? false
                : current.downloading,
          latestVersion,
          message:
            phase === "failed"
              ? "更新下载失败，请稍后重试。"
              : phase === "ready" || phase === "downloaded"
                ? "下载完成，可以立即重启更新。"
                : phase === "started" || phase === "downloading"
                  ? "正在 App 内下载安装包..."
                  : current.message,
          readyToInstall:
            phase === "ready" || phase === "downloaded" || current.readyToInstall,
          restartDialogVisible:
            phase === "ready" || phase === "downloaded"
              ? true
              : current.restartDialogVisible,
          totalBytes: Number(progress.totalBytes) || current.totalBytes,
          visible: true,
        };
      });
    });
  }, []);

  const loadProjects = useCallback(async () => {
    const response = await apiFetch("/api/canvas?workspaceType=all&limit=12", {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | CanvasListResponse
      | null;

    if (!response.ok || payload?.success !== true) {
      throw new Error(payload?.error || "画布列表读取失败");
    }

    setProjects(payload.data || []);
  }, []);

  const checkSession = useCallback(async () => {
    setBusy(true);
    setMessage("正在检查登录状态...");

    try {
      const response = await apiFetch("/api/auth/validate-session", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | ValidateSessionResponse
        | null;
      const nextUser =
        response.ok && payload?.valid === true && payload.user?.id
          ? payload.user
          : null;

      setUser(nextUser);

      if (!nextUser) {
        setView("auth");
        setMessage("请登录云后端账号继续。");
        return;
      }

      setView("workspace");
      setMessage("");
      try {
        await loadProjects();
      } catch {
        setProjects([]);
      }
    } catch {
      setUser(null);
      setView("auth");
      setMessage("无法确认登录状态，请检查云后端连接后重试。");
    } finally {
      setBusy(false);
    }
  }, [loadProjects]);

  useEffect(() => {
    const current = normalizePublicApiRuntimeConfig(getPublicApiRuntimeConfig());
    if (!current.apiBaseUrl) {
      setView("auth");
      setMessage("请配置 VITE_API_BASE_URL 或在首次启动页面连接后端。");
      return;
    }

    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    let cancelled = false;

    apiFetch("/api/auth-settings", {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((payload: AuthSettingsResponse) => {
        if (cancelled) {
          return;
        }

        setSocialAuth({
          appleConfigured: payload?.isAppleConfigured === true,
          appleEnabled: payload?.isAppleEnabled === true,
          clerk: payload?.clerk || null,
          googleConfigured: payload?.isGoogleConfigured === true,
          googleEnabled: payload?.isGoogleEnabled === true,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setSocialAuth({
          appleConfigured: false,
          appleEnabled: false,
          clerk: null,
          googleConfigured: false,
          googleEnabled: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socialAuth.clerk?.isConfigured || !hasPendingDesktopClerkRedirect()) {
      return;
    }

    let cancelled = false;
    setBusy(true);
    setMessage("正在完成社交登录...");

    completeDesktopClerkOAuth({ clerk: socialAuth.clerk })
      .then(async (result) => {
        if (cancelled) {
          return;
        }

        if (result.ok) {
          await checkSession();
          return;
        }

        if (result.status === "missing_clerk_user" && result.clerkToken) {
          setAuthMode("login");
          setView("auth");
          setRegisterMode("personal");
          setRegisterTeamName("");
          setRegisterInviteCode("");
          setVerificationCode("");
          setClerkVerificationPending(false);
          setPendingSocialRegistration({
            clerkToken: result.clerkToken,
            provider: result.provider || "google",
          });
          setMessage("首次使用社交账号登录，请补全身份信息。");
          return;
        }

        throw new Error(result.status);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setAuthMode("login");
        setView("auth");
        setMessage(resolveAuthError(error));
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [checkSession, socialAuth.clerk]);

  useEffect(() => {
    if (view !== "workspace" || !user?.id) {
      return;
    }

    setArchiveConfig(getLocalMediaArchiveRuntimeConfig());
    const scheduler = startLocalMediaArchiveScheduler({
      limit: 100,
      startupDelayMs: 3000,
    });
    return scheduler.stop;
  }, [user?.id, view]);

  const handleAuthModeChange = (mode: AuthMode) => {
    if (mode === "register") {
      const result = startDesktopBrowserRegistration({
        email: authEmail.trim().toLowerCase(),
        inviteCode: "",
        registrationMode: "personal",
        teamName: "",
      });

      if (!result.ok) {
        setMessage(resolveAuthError(new Error(result.status)));
        return;
      }

      setPendingSocialRegistration(null);
      setIsPasswordResetOpen(false);
      setVerificationCode("");
      setClerkVerificationPending(false);
      setRegistrationCodeCooldown(0);
      setMessage("已在浏览器打开注册页，注册成功后会自动回到桌面 App。");
      return;
    }

    setAuthMode(mode);
    setPendingSocialRegistration(null);
    setIsPasswordResetOpen(false);
    setVerificationCode("");
    setClerkVerificationPending(false);
    setRegistrationCodeCooldown(0);
    setMessage("");
  };

  const resetRegisterVerification = () => {
    if (authMode !== "register") {
      return;
    }

    setVerificationCode("");
    setClerkVerificationPending(false);
    setRegistrationCodeCooldown(0);
  };

  const handleAuthEmailChange = (value: string) => {
    setAuthEmail(value);
    resetRegisterVerification();
  };

  const handleAuthPasswordChange = (value: string) => {
    setAuthPassword(value);
    resetRegisterVerification();
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    resetRegisterVerification();
  };

  const handleRegisterModeChange = (mode: RegisterMode) => {
    setRegisterMode(mode);
    setVerificationCode("");
    setClerkVerificationPending(false);
    setRegistrationCodeCooldown(0);
    setMessage("");
  };

  const handleSocialAuth = async (provider: SocialProvider) => {
    const label = provider === "google" ? "Google" : "Apple";
    const enabled =
      provider === "google" ? socialAuth.googleEnabled : socialAuth.appleEnabled;
    const configured =
      provider === "google"
        ? socialAuth.googleConfigured
        : socialAuth.appleConfigured;

    if (!enabled || !configured) {
      setMessage(`${label} 登录还没有完成云端配置，请先在 SaaS 后端启用。`);
      return;
    }

    if (!socialAuth.clerk?.isConfigured || !socialAuth.clerk.publishableKey) {
      setMessage("云后端还没有完成 Clerk 配置，请联系管理员。");
      return;
    }

    setBusy(true);
    setMessage(`正在打开 ${label} 授权...`);
    try {
      const result = await startDesktopClerkOAuth({
        clerk: socialAuth.clerk,
        provider,
      });

      if (!result.ok) {
        throw new Error(result.status);
      }
    } catch (error) {
      setMessage(resolveAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteSocialRegistration = async () => {
    if (!pendingSocialRegistration) {
      return;
    }

    if (registerMode === "create_team" && !registerTeamName.trim()) {
      setMessage("请输入团队名称。");
      return;
    }

    if (registerMode === "join_team" && !registerInviteCode.trim()) {
      setMessage("请输入团队邀请码。");
      return;
    }

    setBusy(true);
    setMessage("正在补全身份信息...");
    try {
      const result = await completeDesktopClerkRegistration({
        clerkToken: pendingSocialRegistration.clerkToken,
        inviteCode: registerInviteCode.trim(),
        registrationMode: registerMode,
        teamName: registerTeamName.trim(),
      });

      if (!result.ok) {
        throw new Error(result.status);
      }

      setPendingSocialRegistration(null);
      setRegisterMode("personal");
      setRegisterTeamName("");
      setRegisterInviteCode("");
      await checkSession();
    } catch (error) {
      setMessage(resolveAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelSocialRegistration = () => {
    setPendingSocialRegistration(null);
    setRegisterMode("personal");
    setRegisterTeamName("");
    setRegisterInviteCode("");
    setMessage("已取消补全身份信息，请重新登录。");
  };

  const openPasswordReset = () => {
    setResetEmail(authEmail.trim().toLowerCase());
    setResetCode("");
    setResetPassword("");
    setResetConfirmPassword("");
    setIsPasswordResetOpen(true);
    setMessage("输入邮箱并获取验证码后即可重置密码。");
  };

  const handleCancelPasswordReset = () => {
    setIsPasswordResetOpen(false);
    setMessage("请登录云后端账号继续。");
  };

  const handleSendPasswordResetCode = async () => {
    const normalizedEmail = resetEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage("请先输入邮箱地址。");
      return;
    }
    if (isSendingResetCode || resetCodeCooldown > 0) {
      return;
    }

    setIsSendingResetCode(true);
    setMessage("正在发送验证码...");
    try {
      const response = await apiFetch("/api/auth/password/reset/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        cooldownSeconds?: number;
        error?: string;
        message?: string;
        status?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.status || payload.error || "verification_code_send_failed"
        );
      }

      setResetEmail(normalizedEmail);
      setResetCodeCooldown(Number(payload.cooldownSeconds) || 60);
      setMessage(payload.message || "如果该邮箱存在，验证码已发送。");
    } catch (error) {
      setMessage(resolveAuthError(error));
    } finally {
      setIsSendingResetCode(false);
    }
  };

  const handleConfirmPasswordReset = async () => {
    const normalizedEmail = resetEmail.trim().toLowerCase();
    if (!normalizedEmail || !resetCode.trim() || !resetPassword) {
      setMessage("请完整填写邮箱、验证码和新密码。");
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setMessage("两次输入的新密码不一致。");
      return;
    }
    const passwordStatus =
      getDesktopRegistrationPasswordStatus(resetPassword) ||
      getDesktopRegistrationPasswordStatus(resetConfirmPassword);
    if (passwordStatus) {
      setMessage(resolveAuthError(new Error(passwordStatus)));
      return;
    }

    setIsResettingPassword(true);
    setMessage("正在重置密码...");
    try {
      const response = await apiFetch("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          code: resetCode.trim(),
          password: resetPassword,
          confirmPassword: resetConfirmPassword,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        status?: string;
        success?: boolean;
      };
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.status || payload.error || "password_reset_failed");
      }

      setAuthEmail(normalizedEmail);
      setAuthPassword("");
      setResetPassword("");
      setResetConfirmPassword("");
      setIsPasswordResetOpen(false);
      setMessage("密码已重置，请使用新密码登录。");
    } catch (error) {
      setMessage(resolveAuthError(error));
    } finally {
      setIsResettingPassword(false);
    }
  };

  const requestDesktopRegistrationCode = async (email: string) => {
    setIsSendingRegistrationCode(true);
    try {
      const response = await apiFetch("/api/desktop-auth/register/send-code", {
        body: JSON.stringify({ email }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | AuthResponse
        | null;
      const cooldownSeconds = Math.max(
        0,
        Math.ceil(Number(payload?.cooldownSeconds) || 0)
      );

      if (cooldownSeconds > 0) {
        setRegistrationCodeCooldown(cooldownSeconds);
      }

      if (!response.ok || payload?.success !== true) {
        throw new Error(
          payload?.error || payload?.status || "verification_code_send_failed"
        );
      }

      setRegistrationCodeCooldown(cooldownSeconds || 60);
      setClerkVerificationPending(true);
      setMessage(
        payload?.expiresInMinutes
          ? `验证码已发送到 ${email}，${payload.expiresInMinutes} 分钟内有效。`
          : `验证码已发送到 ${email}，请查收邮件后继续注册。`
      );
    } finally {
      setIsSendingRegistrationCode(false);
    }
  };

  const handleSendRegistrationCode = async () => {
    const email = authEmail.trim().toLowerCase();
    if (!email) {
      setMessage("请先输入邮箱地址。");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("请输入有效的邮箱地址。");
      return;
    }
    if (isSendingRegistrationCode || registrationCodeCooldown > 0) {
      return;
    }

    try {
      await requestDesktopRegistrationCode(email);
    } catch (error) {
      setMessage(resolveAuthError(error));
    }
  };

  const handleAuth = async () => {
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;

    setBusy(true);
    setMessage(authMode === "login" ? "正在登录 SaaS 后端..." : "正在创建账号...");

    try {
      if (!email || !password) {
        setMessage("请填写邮箱和密码。");
        return;
      }

      if (authMode === "login") {
        const response = await apiFetch("/api/auth/login?mode=json", {
          body: JSON.stringify({
            email,
            password,
            callbackUrl: "/",
          }),
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Yedir-Login-Mode": "json",
          },
          method: "POST",
        });
        const payload = (await response.json().catch(() => null)) as
          | AuthResponse
          | null;

        if (!response.ok || payload?.success !== true) {
          throw new Error(payload?.error || payload?.status || "credentials");
        }

        setAuthPassword("");
        setConfirmPassword("");
        setVerificationCode("");
        setClerkVerificationPending(false);
        await checkSession();
        return;
      }

      const passwordStatus =
        getDesktopRegistrationPasswordStatus(password) ||
        getDesktopRegistrationPasswordStatus(confirmPassword);
      if (passwordStatus) {
        setMessage(resolveAuthError(new Error(passwordStatus)));
        return;
      }

      if (password !== confirmPassword) {
        setMessage("两次密码不一致。");
        return;
      }

      if (registerMode === "create_team" && !registerTeamName.trim()) {
        setMessage("请输入团队名称。");
        return;
      }

      if (registerMode === "join_team" && !registerInviteCode.trim()) {
        setMessage("请输入团队邀请码。");
        return;
      }

      const shouldUseBrowserRegistration = Boolean(
        socialAuth.clerk?.isConfigured && socialAuth.clerk.publishableKey
      );

      if (shouldUseBrowserRegistration) {
        const result = startDesktopBrowserRegistration({
          email,
          inviteCode: registerInviteCode.trim(),
          registrationMode: registerMode,
          teamName: registerTeamName.trim(),
        });

        if (!result.ok) {
          throw new Error(result.status);
        }

        setVerificationCode("");
        setClerkVerificationPending(false);
        setMessage("已在浏览器打开注册页，请在浏览器完成邮箱验证，成功后会自动回到桌面 App。");
        return;
      }

      if (!verificationCode.trim()) {
        setMessage("请先获取并填写邮箱验证码。");
        return;
      }

      const response = await apiFetch("/api/desktop-auth/register", {
        body: JSON.stringify({
          confirmPassword,
          email,
          inviteCode: registerInviteCode.trim(),
          password,
          registrationMode: registerMode,
          teamKey: registerInviteCode.trim(),
          teamName: registerTeamName.trim(),
          verificationCode: verificationCode.trim(),
        }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | AuthResponse
        | null;

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || payload?.status || "registration_failed");
      }

      setAuthPassword("");
      setConfirmPassword("");
      setRegisterTeamName("");
      setRegisterInviteCode("");
      setVerificationCode("");
      setClerkVerificationPending(false);
      setRegistrationCodeCooldown(0);
      await checkSession();
    } catch (error) {
      setMessage(resolveAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCanvas = async () => {
    setBusy(true);
    setMessage("正在创建画布...");

    try {
      const response = await apiFetch("/api/canvas", {
        body: JSON.stringify({
          canvasData: {
            edges: [],
            nodes: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          title: "未命名画布",
          workspaceType: "canvas",
        }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | CanvasCreateResponse
        | null;

      if (!response.ok || payload?.success !== true) {
        setMessage(payload?.error || "创建画布失败");
        return;
      }

      setMessage("画布已创建。");
      await loadProjects();
    } catch {
      setMessage("创建画布失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  };

  const refreshArchiveConfig = () => {
    setArchiveConfig(getLocalMediaArchiveRuntimeConfig());
  };

  const handleChooseArchiveDirectory = async () => {
    setArchiveBusy(true);
    setArchiveMessage("正在打开本地目录选择...");

    try {
      const directory = await chooseLocalArchiveDirectory();
      refreshArchiveConfig();
      setArchiveMessage(
        directory
          ? `已选择归档目录：${directory.displayName || directory.directoryId}`
          : "没有选择归档目录。"
      );
    } catch {
      setArchiveMessage("目录选择失败，请确认桌面壳已启用本地归档桥。");
    } finally {
      setArchiveBusy(false);
    }
  };

  const handleToggleArchive = (enabled: boolean) => {
    const current = getLocalMediaArchiveRuntimeConfig();
    if (enabled && !current.directoryId) {
      setArchiveMessage("请先选择本地归档目录。");
      return;
    }

    saveLocalMediaArchiveRuntimeConfig({
      ...current,
      enabled,
      lastError: null,
    });
    refreshArchiveConfig();
    setArchiveMessage(enabled ? "本地归档已开启。" : "本地归档已暂停。");
  };

  const handleRunArchiveSync = async () => {
    setArchiveBusy(true);
    setArchiveMessage("正在同步待归档图片...");

    try {
      const result = await runScheduledLocalArchiveSync({
        force: true,
        limit: 100,
      });
      refreshArchiveConfig();
      setArchiveMessage(formatArchiveSyncResult(result));
    } catch {
      refreshArchiveConfig();
      setArchiveMessage("本地归档同步失败，请稍后重试。");
    } finally {
      setArchiveBusy(false);
    }
  };

  const desktopUpdateBanner = desktopUpdate.visible ? (
    <DesktopUpdateBanner
      artifactName={desktopUpdate.artifactName}
      downloadPercent={desktopUpdate.downloadPercent}
      downloading={desktopUpdate.downloading}
      installing={desktopUpdate.installing}
      latestVersion={desktopUpdate.latestVersion}
      message={desktopUpdate.message}
      notes={desktopUpdate.notes}
      onDismiss={handleDismissDesktopUpdate}
      onInstall={() => {
        if (desktopUpdate.readyToInstall) {
          setDesktopUpdate((current) => ({
            ...current,
            restartDialogVisible: true,
          }));
          return;
        }
        void handleDownloadDesktopUpdate();
      }}
      readyToInstall={desktopUpdate.readyToInstall}
      totalBytes={desktopUpdate.totalBytes}
    />
  ) : null;
  const desktopUpdateRestartDialog = desktopUpdate.restartDialogVisible ? (
    <DesktopUpdateRestartDialog
      installing={desktopUpdate.installing}
      latestVersion={desktopUpdate.latestVersion}
      onConfirm={() => {
        void handleInstallDownloadedDesktopUpdate();
      }}
      onLater={handlePostponeDownloadedDesktopUpdate}
    />
  ) : null;

  if (view === "workspace") {
    return (
      <>
        <DesktopFrontendApp updateBanner={desktopUpdateBanner} user={user} />
        {desktopUpdateRestartDialog}
      </>
    );
  }

  if (view === "boot") {
    return (
      <CanvasLogoLoadingView
        label={message || "正在进入 FrameLoom"}
      />
    );
  }

  return (
    <main className="desktop-app-shell">
      {desktopUpdateBanner}
      {desktopUpdateRestartDialog}
      <section className="desktop-brand-panel" aria-label="FrameLoom">
        <img
          alt=""
          aria-hidden="true"
          className="desktop-brand-art"
          src={LOGIN_HERO_IMAGE_SRC}
        />
        <div className="desktop-brand-overlay" aria-hidden="true" />
        <img className="desktop-logo" src={brandMarkUrl} alt="FrameLoom" />
        <p className="desktop-creator-credit">AI Creator @FrameLoom</p>
      </section>

      <section className="desktop-card" aria-live="polite">
        {view === "auth" ? (
          <AuthForm
            authEmail={authEmail}
            authMode={authMode}
            authPassword={authPassword}
            busy={busy}
            clerkVerificationPending={clerkVerificationPending}
            confirmPassword={confirmPassword}
            isPasswordResetOpen={isPasswordResetOpen}
            isPasswordVisible={isPasswordVisible}
            isResettingPassword={isResettingPassword}
            isSendingRegistrationCode={isSendingRegistrationCode}
            isSendingResetCode={isSendingResetCode}
            message={message}
            onAuth={handleAuth}
            onCancelPasswordReset={handleCancelPasswordReset}
            onConfirmPasswordReset={handleConfirmPasswordReset}
            onEmailChange={handleAuthEmailChange}
            onModeChange={handleAuthModeChange}
            onOpenPasswordReset={openPasswordReset}
            onPasswordChange={handleAuthPasswordChange}
            onConfirmPasswordChange={handleConfirmPasswordChange}
            onRegisterInviteCodeChange={setRegisterInviteCode}
            onRegisterModeChange={handleRegisterModeChange}
            onRegisterTeamNameChange={setRegisterTeamName}
            onResetCodeChange={setResetCode}
            onResetConfirmPasswordChange={setResetConfirmPassword}
            onResetEmailChange={setResetEmail}
            onResetPasswordChange={setResetPassword}
            onSendPasswordResetCode={handleSendPasswordResetCode}
            onSendRegistrationCode={handleSendRegistrationCode}
            onSocialAuth={handleSocialAuth}
            onTogglePasswordVisible={() => setIsPasswordVisible((value) => !value)}
            onVerificationCodeChange={setVerificationCode}
            registerInviteCode={registerInviteCode}
            registrationCodeCooldown={registrationCodeCooldown}
            registerMode={registerMode}
            registerTeamName={registerTeamName}
            resetCode={resetCode}
            resetCodeCooldown={resetCodeCooldown}
            resetConfirmPassword={resetConfirmPassword}
            resetEmail={resetEmail}
            resetPassword={resetPassword}
            socialAuth={socialAuth}
            usesBrowserRegistration={Boolean(
              socialAuth.clerk?.isConfigured && socialAuth.clerk.publishableKey
            )}
            verificationCode={verificationCode}
          />
        ) : null}

        {view === "auth" && pendingSocialRegistration ? (
          <SocialRegistrationDialog
            busy={busy}
            inviteCode={registerInviteCode}
            onCancel={handleCancelSocialRegistration}
            onConfirm={handleCompleteSocialRegistration}
            onInviteCodeChange={setRegisterInviteCode}
            onModeChange={handleRegisterModeChange}
            onTeamNameChange={setRegisterTeamName}
            registerMode={registerMode}
            teamName={registerTeamName}
          />
        ) : null}

      </section>
    </main>
  );
}

function AuthForm(props: {
  authEmail: string;
  authMode: AuthMode;
  authPassword: string;
  busy: boolean;
  clerkVerificationPending: boolean;
  confirmPassword: string;
  isPasswordResetOpen: boolean;
  isPasswordVisible: boolean;
  isResettingPassword: boolean;
  isSendingRegistrationCode: boolean;
  isSendingResetCode: boolean;
  message: string;
  onAuth: () => void;
  onCancelPasswordReset: () => void;
  onConfirmPasswordReset: () => void;
  onConfirmPasswordChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onModeChange: (value: AuthMode) => void;
  onOpenPasswordReset: () => void;
  onPasswordChange: (value: string) => void;
  onRegisterInviteCodeChange: (value: string) => void;
  onRegisterModeChange: (value: RegisterMode) => void;
  onRegisterTeamNameChange: (value: string) => void;
  onResetCodeChange: (value: string) => void;
  onResetConfirmPasswordChange: (value: string) => void;
  onResetEmailChange: (value: string) => void;
  onResetPasswordChange: (value: string) => void;
  onSendPasswordResetCode: () => void;
  onSendRegistrationCode: () => void;
  onSocialAuth: (provider: SocialProvider) => Promise<void> | void;
  onTogglePasswordVisible: () => void;
  onVerificationCodeChange: (value: string) => void;
  registerInviteCode: string;
  registrationCodeCooldown: number;
  registerMode: RegisterMode;
  registerTeamName: string;
  resetCode: string;
  resetCodeCooldown: number;
  resetConfirmPassword: string;
  resetEmail: string;
  resetPassword: string;
  socialAuth: SocialAuthState;
  usesBrowserRegistration: boolean;
  verificationCode: string;
}) {
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const handleSocialButtonClick = (provider: SocialProvider) => {
    void props.onSocialAuth(provider);
  };

  if (props.isPasswordResetOpen) {
    return (
      <PasswordResetForm
        busy={props.isResettingPassword}
        isSendingResetCode={props.isSendingResetCode}
        message={props.message}
        onCancel={props.onCancelPasswordReset}
        onCodeChange={props.onResetCodeChange}
        onConfirm={props.onConfirmPasswordReset}
        onConfirmPasswordChange={props.onResetConfirmPasswordChange}
        onEmailChange={props.onResetEmailChange}
        onPasswordChange={props.onResetPasswordChange}
        onSendCode={props.onSendPasswordResetCode}
        resetCode={props.resetCode}
        resetCodeCooldown={props.resetCodeCooldown}
        resetConfirmPassword={props.resetConfirmPassword}
        resetEmail={props.resetEmail}
        resetPassword={props.resetPassword}
      />
    );
  }

  return (
    <div className="desktop-stack">
      <div className="desktop-auth-heading">
        <div>
        <p className="desktop-section-label">FrameLoom</p>
        <h2>{props.authMode === "login" ? "登录账号" : "注册账号"}</h2>
        </div>
        {props.authMode === "register" ? (
          <button
            aria-label="返回登录"
            className="desktop-back-button"
            disabled={props.busy}
            onClick={() => props.onModeChange("login")}
            title="返回登录"
            type="button"
          >
            <ArrowLeft aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <Field
        label="邮箱"
        autoComplete="email"
        onChange={props.onEmailChange}
        placeholder="name@example.com"
        type="email"
        value={props.authEmail}
      />
      <Field
        label="密码"
        autoComplete={
          props.authMode === "login" ? "current-password" : "new-password"
        }
        onChange={props.onPasswordChange}
        placeholder="输入密码"
        rightSlot={
          <button
            aria-label={props.isPasswordVisible ? "隐藏密码" : "显示密码"}
            className="desktop-field-icon-button"
            onClick={props.onTogglePasswordVisible}
            type="button"
          >
            {props.isPasswordVisible ? (
              <Eye className="desktop-field-icon" />
            ) : (
              <EyeOff className="desktop-field-icon" />
            )}
          </button>
        }
        type={props.isPasswordVisible ? "text" : "password"}
        value={props.authPassword}
      />
      {props.authMode === "login" ? (
        <button
          className="desktop-inline-link"
          onClick={props.onOpenPasswordReset}
          type="button"
        >
          忘记密码？
        </button>
      ) : null}
      {props.authMode === "register" ? (
        <>
          <Field
            label="确认密码"
            autoComplete="new-password"
            onChange={props.onConfirmPasswordChange}
            placeholder="再次输入密码"
            rightSlot={
              <button
                aria-label={
                  isConfirmPasswordVisible ? "隐藏确认密码" : "显示确认密码"
                }
                className="desktop-field-icon-button"
                onClick={() =>
                  setIsConfirmPasswordVisible((value) => !value)
                }
                type="button"
              >
                {isConfirmPasswordVisible ? (
                  <Eye className="desktop-field-icon" />
                ) : (
                  <EyeOff className="desktop-field-icon" />
                )}
              </button>
            }
            type={isConfirmPasswordVisible ? "text" : "password"}
            value={props.confirmPassword}
          />
          <p className="desktop-field-hint">
            {REGISTRATION_PASSWORD_REQUIREMENT_MESSAGE}
          </p>
          <div className="desktop-mode-options" role="group" aria-label="注册身份">
            <button
              className={props.registerMode === "personal" ? "is-active" : ""}
              onClick={() => props.onRegisterModeChange("personal")}
              type="button"
            >
              个人
            </button>
            <button
              className={
                props.registerMode === "create_team" ? "is-active" : ""
              }
              onClick={() => props.onRegisterModeChange("create_team")}
              type="button"
            >
              创建团队
            </button>
            <button
              className={props.registerMode === "join_team" ? "is-active" : ""}
              onClick={() => props.onRegisterModeChange("join_team")}
              type="button"
            >
              加入团队
            </button>
          </div>
          {props.registerMode === "create_team" ? (
            <Field
              label="团队名称"
              onChange={props.onRegisterTeamNameChange}
              placeholder="输入团队名称"
              value={props.registerTeamName}
            />
          ) : null}
          {props.registerMode === "join_team" ? (
            <Field
              label="团队邀请码"
              onChange={props.onRegisterInviteCodeChange}
              placeholder="输入团队邀请码"
              type="password"
              value={props.registerInviteCode}
            />
          ) : null}
          {props.usesBrowserRegistration ? null : (
            <div className="desktop-field-with-action">
              <Field
                label="邮箱验证码"
                autoComplete="one-time-code"
                onChange={props.onVerificationCodeChange}
                placeholder={
                  props.clerkVerificationPending
                    ? "输入邮箱验证码"
                    : "首次点击注册会发送验证码"
                }
                value={props.verificationCode}
              />
              <button
                className="desktop-secondary-button"
                disabled={
                  props.isSendingRegistrationCode ||
                  props.registrationCodeCooldown > 0
                }
                onClick={props.onSendRegistrationCode}
                type="button"
              >
                {props.isSendingRegistrationCode
                  ? "发送中"
                  : props.registrationCodeCooldown > 0
                    ? `重新获取 (${props.registrationCodeCooldown}s)`
                    : props.clerkVerificationPending
                      ? "重新获取验证码"
                      : "获取验证码"}
              </button>
            </div>
          )}
        </>
      ) : null}
      <ActionRow>
        <button
          className="desktop-primary-button"
          disabled={
            props.busy ||
            props.isSendingRegistrationCode ||
            (props.authMode === "register" &&
              !props.usesBrowserRegistration &&
              !props.clerkVerificationPending)
          }
          onClick={props.onAuth}
          type="button"
        >
          {props.busy
            ? "处理中"
            : props.authMode === "login"
              ? "登录"
              : props.usesBrowserRegistration
                ? "注册"
                : "完成注册"}
        </button>
        {props.authMode === "login" ? (
          <button
            className="desktop-dark-button"
            disabled={props.busy}
            onClick={() => props.onModeChange("register")}
            type="button"
          >
            注册
          </button>
        ) : null}
      </ActionRow>
      <SocialAuthButtons
        onSocialAuth={handleSocialButtonClick}
        socialAuth={props.socialAuth}
      />
      <Message text={props.message} />
    </div>
  );
}

function DesktopUpdateBanner(props: {
  artifactName: string;
  downloadPercent: number;
  downloading: boolean;
  installing: boolean;
  latestVersion: string;
  message: string;
  notes: string;
  onDismiss: () => void;
  onInstall: () => void;
  readyToInstall: boolean;
  totalBytes: number;
}) {
  const isBusy = props.downloading || props.installing;
  const actionLabel = props.readyToInstall
    ? "重启更新"
    : props.downloading
      ? `${props.downloadPercent || 0}%`
      : "下载更新";

  return (
    <aside className="desktop-update-banner" aria-live="polite">
      <div className="desktop-update-copy">
        <p className="desktop-update-kicker">发现新版本</p>
        <h2>FrameLoom {props.latestVersion}</h2>
        <p>
          {props.message ||
            props.notes ||
            props.artifactName ||
            "官方安装包已准备好，可在 App 内下载更新。"}
        </p>
        {props.downloading || props.readyToInstall ? (
          <div
            aria-label={`更新下载进度 ${props.downloadPercent || 0}%`}
            className="desktop-update-progress"
            role="progressbar"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={props.downloadPercent || 0}
          >
            <span
              style={{
                width: `${Math.max(0, Math.min(100, props.downloadPercent || 0))}%`,
              }}
            />
          </div>
        ) : null}
      </div>
      <div className="desktop-update-actions">
        <button
          className="desktop-update-install-button"
          disabled={isBusy}
          onClick={props.onInstall}
          type="button"
        >
          {isBusy ? (
            <Loader2 aria-hidden="true" className="desktop-update-spinner" />
          ) : (
            <Download aria-hidden="true" />
          )}
          {actionLabel}
        </button>
        <button
          aria-label="稍后提醒"
          className="desktop-update-dismiss-button"
          disabled={isBusy}
          onClick={props.onDismiss}
          type="button"
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

function DesktopUpdateRestartDialog(props: {
  installing: boolean;
  latestVersion: string;
  onConfirm: () => void;
  onLater: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (props.installing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        props.onLater();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        props.onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.installing, props.onConfirm, props.onLater]);

  return (
    <div className="desktop-update-modal-backdrop" role="presentation">
      <section
        aria-labelledby="desktop-update-dialog-title"
        aria-modal="true"
        className="desktop-update-modal"
        role="dialog"
      >
        <h2 id="desktop-update-dialog-title">
          确认更新到 v{props.latestVersion}?
        </h2>
        <p>
          安装包已在 App 内下载完成。应用将立即退出并启动安装程序，正在进行的会话会被中断。
        </p>
        <div className="desktop-update-modal-actions">
          <button
            className="desktop-update-modal-later"
            disabled={props.installing}
            onClick={props.onLater}
            type="button"
          >
            稍后
            <span>esc</span>
          </button>
          <button
            className="desktop-update-modal-confirm"
            disabled={props.installing}
            onClick={props.onConfirm}
            type="button"
          >
            {props.installing ? (
              <Loader2 aria-hidden="true" className="desktop-update-spinner" />
            ) : null}
            立即重启更新
            <span>↵</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function PasswordResetForm(props: {
  busy: boolean;
  isSendingResetCode: boolean;
  message: string;
  onCancel: () => void;
  onCodeChange: (value: string) => void;
  onConfirm: () => void;
  onConfirmPasswordChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSendCode: () => void;
  resetCode: string;
  resetCodeCooldown: number;
  resetConfirmPassword: string;
  resetEmail: string;
  resetPassword: string;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  return (
    <div className="desktop-stack">
      <div>
        <p className="desktop-section-label">FrameLoom</p>
        <h2>重置密码</h2>
      </div>
      <div className="desktop-field-with-action">
        <Field
          autoComplete="email"
          label="邮箱地址"
          onChange={props.onEmailChange}
          placeholder="name@example.com"
          type="email"
          value={props.resetEmail}
        />
        <button
          className="desktop-secondary-button"
          disabled={props.isSendingResetCode || props.resetCodeCooldown > 0}
          onClick={props.onSendCode}
          type="button"
        >
          {props.isSendingResetCode
            ? "发送中"
            : props.resetCodeCooldown > 0
              ? `${props.resetCodeCooldown}s`
              : "发送验证码"}
        </button>
      </div>
      <Field
        autoComplete="one-time-code"
        label="验证码"
        maxLength={6}
        onChange={props.onCodeChange}
        placeholder="请输入 6 位验证码"
        value={props.resetCode}
      />
      <Field
        autoComplete="new-password"
        label="新密码"
        minLength={8}
        onChange={props.onPasswordChange}
        placeholder="至少 8 位，包含大小写字母、数字和特殊符号"
        rightSlot={
          <button
            aria-label={isPasswordVisible ? "隐藏新密码" : "显示新密码"}
            className="desktop-field-icon-button"
            onClick={() => setIsPasswordVisible((value) => !value)}
            type="button"
          >
            {isPasswordVisible ? (
              <Eye className="desktop-field-icon" />
            ) : (
              <EyeOff className="desktop-field-icon" />
            )}
          </button>
        }
        type={isPasswordVisible ? "text" : "password"}
        value={props.resetPassword}
      />
      <p className="desktop-field-hint">
        {REGISTRATION_PASSWORD_REQUIREMENT_MESSAGE}
      </p>
      <Field
        autoComplete="new-password"
        label="确认新密码"
        minLength={8}
        onChange={props.onConfirmPasswordChange}
        placeholder="再次输入新密码"
        rightSlot={
          <button
            aria-label={
              isConfirmPasswordVisible ? "隐藏确认新密码" : "显示确认新密码"
            }
            className="desktop-field-icon-button"
            onClick={() =>
              setIsConfirmPasswordVisible((value) => !value)
            }
            type="button"
          >
            {isConfirmPasswordVisible ? (
              <Eye className="desktop-field-icon" />
            ) : (
              <EyeOff className="desktop-field-icon" />
            )}
          </button>
        }
        type={isConfirmPasswordVisible ? "text" : "password"}
        value={props.resetConfirmPassword}
      />
      <ActionRow>
        <button
          className="desktop-secondary-button"
          onClick={props.onCancel}
          type="button"
        >
          返回登录
        </button>
        <button
          className="desktop-primary-button"
          disabled={props.busy}
          onClick={props.onConfirm}
          type="button"
        >
          {props.busy ? "重置中" : "确认重置"}
        </button>
      </ActionRow>
      <Message text={props.message} />
    </div>
  );
}

function SocialAuthButtons(props: {
  onSocialAuth: (provider: SocialProvider) => void;
  socialAuth: SocialAuthState;
}) {
  const googleAvailable =
    props.socialAuth.googleEnabled && props.socialAuth.googleConfigured;
  const appleAvailable =
    props.socialAuth.appleEnabled && props.socialAuth.appleConfigured;

  return (
    <div className="desktop-social-auth">
      <div className="desktop-social-grid">
        <button
          aria-disabled={!googleAvailable}
          className={`desktop-social-button${googleAvailable ? "" : " is-unavailable"}`}
          onClick={() => props.onSocialAuth("google")}
          type="button"
        >
          <GoogleMark />
          <span>Google 登录</span>
        </button>
        <button
          aria-disabled={!appleAvailable}
          className={`desktop-social-button${appleAvailable ? "" : " is-unavailable"}`}
          onClick={() => props.onSocialAuth("apple")}
          type="button"
        >
          <AppleMark />
          <span>Apple 登录</span>
        </button>
      </div>
    </div>
  );
}

function SocialRegistrationDialog(props: {
  busy: boolean;
  inviteCode: string;
  onCancel: () => void;
  onConfirm: () => void;
  onInviteCodeChange: (value: string) => void;
  onModeChange: (value: RegisterMode) => void;
  onTeamNameChange: (value: string) => void;
  registerMode: RegisterMode;
  teamName: string;
}) {
  return (
    <div className="desktop-modal-backdrop" role="presentation">
      <div
        aria-labelledby="desktop-social-dialog-title"
        aria-modal="true"
        className="desktop-social-dialog"
        role="dialog"
      >
        <p className="desktop-section-label">FrameLoom</p>
        <h3 id="desktop-social-dialog-title">补全身份信息</h3>
        <div
          className="desktop-mode-options desktop-social-mode-picker"
          role="group"
          aria-label="首次社交登录归属"
        >
          <button
            className={props.registerMode === "personal" ? "is-active" : ""}
            onClick={() => props.onModeChange("personal")}
            type="button"
          >
            个人
          </button>
          <button
            className={props.registerMode === "create_team" ? "is-active" : ""}
            onClick={() => props.onModeChange("create_team")}
            type="button"
          >
            创建团队
          </button>
          <button
            className={props.registerMode === "join_team" ? "is-active" : ""}
            onClick={() => props.onModeChange("join_team")}
            type="button"
          >
            加入团队
          </button>
        </div>
        {props.registerMode === "create_team" ? (
          <Field
            label="团队名称"
            onChange={props.onTeamNameChange}
            placeholder="输入团队名称"
            value={props.teamName}
          />
        ) : null}
        {props.registerMode === "join_team" ? (
          <Field
            label="团队邀请码"
            onChange={props.onInviteCodeChange}
            placeholder="输入团队邀请码"
            type="password"
            value={props.inviteCode}
          />
        ) : null}
        <div className="desktop-actions desktop-social-dialog-actions">
          <button
            className="desktop-secondary-button"
            disabled={props.busy}
            onClick={props.onCancel}
            type="button"
          >
            取消
          </button>
          <button
            className="desktop-primary-button"
            disabled={props.busy}
            onClick={props.onConfirm}
            type="button"
          >
            {props.busy ? "处理中" : "完成绑定"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      className="desktop-social-icon"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.5-5.5 3.5-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 2.9 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"
        fill="currentColor"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg
      aria-hidden="true"
      className="desktop-social-icon"
      viewBox="0 0 24 24"
    >
      <path
        d="M16.6 12.4c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.5-1.7-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.7-1.4 0-2.7.8-3.5 2.1-1.5 2.7-.4 6.6 1.1 8.8.7 1.1 1.6 2.3 2.8 2.2 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1.1 2.7-2.2.8-1.2 1.1-2.4 1.1-2.4 0-.1-2.7-1-2.7-3.7ZM14.5 6.2c.6-.8 1-1.8.9-2.8-.9 0-2 .6-2.6 1.3-.6.7-1 1.8-.9 2.8 1 0 2-.5 2.6-1.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DesktopHomePanel(props: {
  busy: boolean;
  message: string;
  onCreateCanvas: () => void;
  onReload: () => Promise<void>;
  projects: CanvasProject[];
  user: SessionUser | null;
}) {
  const displayName =
    props.user?.name ||
    props.user?.email?.split("@")[0] ||
    "Creator";
  const recentProjects = props.projects.slice(0, 4);

  return (
    <div className="desktop-stack desktop-home-stack">
      <div className="desktop-home-heading">
        <div>
          <p className="desktop-section-label">FrameLoom</p>
          <h2>{displayName}，开始创作</h2>
        </div>
        <button
          className="desktop-secondary-button"
          onClick={() => void props.onReload()}
          type="button"
        >
          刷新
        </button>
      </div>

      <section className="desktop-home-composer" aria-label="FrameLoom">
        <p>今天想创作什么？</p>
        <button
          className="desktop-primary-button desktop-home-primary"
          disabled={props.busy}
          onClick={props.onCreateCanvas}
          type="button"
        >
          新建画布
        </button>
      </section>

      <section className="desktop-home-section" aria-label="最近画布">
        <div className="desktop-home-section-heading">
          <h3>最近画布</h3>
        </div>
        {recentProjects.length > 0 ? (
          <div className="desktop-home-projects">
            {recentProjects.map((project) => (
              <article className="desktop-home-project" key={project.id}>
                <span>{project.title || "未命名画布"}</span>
                <small>{formatProjectTime(project.updatedAt)}</small>
              </article>
            ))}
          </div>
        ) : (
          <button
            className="desktop-home-empty"
            disabled={props.busy}
            onClick={props.onCreateCanvas}
            type="button"
          >
            <span>新建第一个画布</span>
          </button>
        )}
      </section>

      <Message text={props.message} />
    </div>
  );
}

function WorkspacePanel(props: {
  archiveBusy: boolean;
  archiveConfig: LocalMediaArchiveRuntimeConfig;
  archiveMessage: string;
  bridgeAvailable: boolean;
  busy: boolean;
  message: string;
  onChooseArchiveDirectory: () => void;
  onCreateCanvas: () => void;
  onRunArchiveSync: () => void;
  onReload: () => Promise<void>;
  onToggleArchive: (enabled: boolean) => void;
  projects: CanvasProject[];
  user: SessionUser | null;
}) {
  return (
    <div className="desktop-stack">
      <div>
        <p className="desktop-section-label">
          {props.user?.teamRole ? `团队角色 ${props.user.teamRole}` : "已登录"}
        </p>
        <h2>Hi, {props.user?.name || props.user?.email || "Local Admin"}</h2>
        <p className="desktop-hint">
          已通过云后端读取到 {props.projects.length} 个最近画布项目。
        </p>
      </div>
      <ActionRow>
        <button
          className="desktop-primary-button"
          disabled={props.busy}
          onClick={props.onCreateCanvas}
          type="button"
        >
          新建云端画布
        </button>
        <button
          className="desktop-secondary-button"
          onClick={() => void props.onReload()}
          type="button"
        >
          刷新列表
        </button>
      </ActionRow>
      <LocalArchivePanel
        busy={props.archiveBusy}
        config={props.archiveConfig}
        message={props.archiveMessage}
        bridgeAvailable={props.bridgeAvailable}
        onChooseDirectory={props.onChooseArchiveDirectory}
        onRunSync={props.onRunArchiveSync}
        onToggle={props.onToggleArchive}
      />
      <div className="desktop-project-list">
        {props.projects.length > 0 ? (
          props.projects.map((project) => (
            <article className="desktop-project-item" key={project.id}>
              <span>{project.title || "未命名画布"}</span>
              <small>{formatProjectTime(project.updatedAt)}</small>
            </article>
          ))
        ) : (
          <div className="desktop-empty">还没有云端画布项目。</div>
        )}
      </div>
      <Message text={props.message} />
    </div>
  );
}

function LocalArchivePanel(props: {
  bridgeAvailable: boolean;
  busy: boolean;
  config: LocalMediaArchiveRuntimeConfig;
  message: string;
  onChooseDirectory: () => void;
  onRunSync: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const enabled = props.config.enabled === true;
  const directoryLabel =
    props.config.directoryLabel || props.config.directoryId || "未选择";
  const lastSync =
    props.config.lastArchiveCompletedAt ||
    props.config.lastManifestSyncAt ||
    props.config.lastSyncAttemptAt ||
    "";

  return (
    <section className="desktop-archive-panel">
      <div>
        <p className="desktop-section-label">本地图片归档</p>
        <h3>6 天到期前自动转存</h3>
        <p className="desktop-hint">
          桌面端只保存目录 ID 和显示名，云后端不会收到本机绝对路径。
        </p>
      </div>
      <div className="desktop-archive-grid">
        <ArchiveMeta
          label="桌面桥"
          value={props.bridgeAvailable ? "已连接" : "未启用"}
        />
        <ArchiveMeta label="归档目录" value={directoryLabel} />
        <ArchiveMeta label="上次同步" value={formatArchiveTime(lastSync)} />
        <ArchiveMeta
          label="状态"
          value={enabled ? "自动归档中" : "已暂停"}
        />
      </div>
      {props.config.lastError ? (
        <p className="desktop-archive-error">{props.config.lastError}</p>
      ) : null}
      {props.message ? <p className="desktop-message">{props.message}</p> : null}
      <div className="desktop-actions">
        <button
          className="desktop-secondary-button"
          disabled={props.busy || !props.bridgeAvailable}
          onClick={props.onChooseDirectory}
          type="button"
        >
          选择目录
        </button>
        <button
          className="desktop-secondary-button"
          disabled={props.busy || !props.config.directoryId}
          onClick={() => props.onToggle(!enabled)}
          type="button"
        >
          {enabled ? "暂停自动归档" : "开启自动归档"}
        </button>
        <button
          className="desktop-primary-button"
          disabled={props.busy || !enabled || !props.bridgeAvailable}
          onClick={props.onRunSync}
          type="button"
        >
          {props.busy ? "同步中" : "立即同步"}
        </button>
      </div>
    </section>
  );
}

function ArchiveMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="desktop-archive-meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field(props: {
  autoComplete?: string;
  label: string;
  maxLength?: number;
  minLength?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  rightSlot?: ReactNode;
  type?: string;
  value: string;
}) {
  return (
    <label className="desktop-field">
      <span>{props.label}</span>
      <div className="desktop-input-shell">
        <input
          autoComplete={props.autoComplete || "off"}
          maxLength={props.maxLength}
          minLength={props.minLength}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
          type={props.type || "text"}
          value={props.value}
        />
        {props.rightSlot}
      </div>
    </label>
  );
}

function ActionRow({ children }: { children: ReactNode }) {
  return <div className="desktop-actions">{children}</div>;
}

function Message({ text }: { text: string }) {
  if (!text) {
    return null;
  }

  return <p className="desktop-message">{text}</p>;
}

function resolveAuthError(input: unknown) {
  const reason = extractAuthErrorReason(input);
  const labels: Record<string, string> = {
    auth_settings_unavailable: "认证配置读取失败，请确认网络正常并使用官方安装包。",
    clerk_not_configured: "云后端还没有完成 Clerk 配置，请联系管理员。",
    credentials: "账号或密码错误",
    email_sender_not_configured:
      "邮件发信服务未配置，请先在 SaaS 后台配置 Resend API Key 和发件邮箱。",
    email_address_exists: "该邮箱已注册，请直接登录。",
    form_identifier_exists: "该邮箱已注册，请直接登录。",
    form_identifier_not_found: "账号不存在，请先注册。",
    form_password_incorrect: "账号或密码错误。",
    invite_code_invalid: "团队邀请码无效或已过期",
    invite_code_required: "请输入团队邀请码",
    invalid_data: "请完整填写账号信息",
    invalid_clerk_token: "Clerk 登录凭证无效，请重新登录。",
    missing_bearer_token: "Clerk 登录凭证缺失，请重新登录。",
    missing_clerk_session_token: "Clerk 会话未创建成功，请重新登录。",
    missing_clerk_user: "首次使用社交账号登录，请补全身份信息。",
    missing_primary_email: "Clerk 账号缺少主邮箱，请先在 Clerk 完善邮箱。",
    oauth_callback_failed: "社交登录回调处理失败，请重新发起授权。",
    oauth_start_failed:
      "社交登录启动失败，请确认 Clerk 已启用对应的 Google/Apple Provider。",
    password_policy_failed: REGISTRATION_PASSWORD_REQUIREMENT_MESSAGE,
    password_mismatch: "两次密码不一致",
    password_too_short: "密码至少需要 8 位。",
    registration_failed: "注册失败，请稍后重试。",
    registration_disabled: "当前系统未开放注册。",
    password_reset_failed: "重置密码失败，请稍后重试。",
    captcha_required: "请先完成人机验证后再发送验证码。",
    captcha_invalid: "人机验证失败，请刷新后重试。",
    captcha_unavailable: "人机验证暂时不可用，请稍后重试。",
    rate_limited: "请求过于频繁，请稍后再试",
    session_bridge_failed: "登录态桥接失败，请稍后重试。",
    team_key_invalid: "团队邀请码无效或已过期",
    team_key_required: "请输入团队邀请码",
    team_name_required: "请输入团队名称",
    user_not_allowed: "该账号尚未加入可用团队，请选择加入团队后再登录。",
    user_exists: "该邮箱已注册，请直接登录",
    verification_code_expired: "邮箱验证码已过期",
    verification_code_invalid: "邮箱验证码不正确",
    verification_code_required: "请填写邮箱验证码",
    verification_code_send_failed: "验证码发送失败，请稍后重试。",
  };

  return labels[String(reason || "")] || "认证失败，请稍后重试。";
}

function getDesktopRegistrationPasswordStatus(password: string) {
  if (password.length < 8) {
    return "password_too_short";
  }
  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9\s]/.test(password)
  ) {
    return "password_policy_failed";
  }
  return "";
}

function extractAuthErrorReason(input: unknown) {
  if (!input) {
    return "";
  }

  if (input instanceof Error) {
    const message = input.message || "";
    if (message) {
      return normalizeAuthErrorCode(message);
    }
  }

  const payload = input as
    | {
        error?: unknown;
        status?: unknown;
        code?: unknown;
        message?: unknown;
        errors?: Array<{
          code?: unknown;
          longMessage?: unknown;
          message?: unknown;
        }>;
      }
    | undefined;
  const firstError = Array.isArray(payload?.errors) ? payload?.errors[0] : null;
  return normalizeAuthErrorCode(
    firstError?.code ||
      firstError?.longMessage ||
      firstError?.message ||
      payload?.status ||
      payload?.error ||
      payload?.code ||
      payload?.message ||
      ""
  );
}

function normalizeAuthErrorCode(input: unknown) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) {
    return "";
  }

  const known = raw.match(
    /(auth_settings_unavailable|clerk_not_configured|credentials|email_sender_not_configured|email_address_exists|form_identifier_exists|form_identifier_not_found|form_password_incorrect|invite_code_invalid|invite_code_required|invalid_data|invalid_clerk_token|missing_bearer_token|missing_clerk_session_token|missing_clerk_user|missing_primary_email|oauth_callback_failed|oauth_start_failed|password_mismatch|password_policy_failed|password_reset_failed|password_too_short|registration_disabled|captcha_required|captcha_invalid|captcha_unavailable|rate_limited|session_bridge_failed|team_key_invalid|team_key_required|team_name_required|user_not_allowed|user_exists|verification_code_expired|verification_code_invalid|verification_code_required|verification_code_send_failed)/
  );
  if (known?.[1]) {
    return known[1];
  }

  if (raw.includes("identifier") && raw.includes("exist")) {
    return "user_exists";
  }

  if (raw.includes("identifier") && raw.includes("not")) {
    return "form_identifier_not_found";
  }

  if (raw.includes("password")) {
    if (raw.includes("short") || raw.includes("length")) {
      return "password_too_short";
    }
    if (raw.includes("policy") || raw.includes("pwned") || raw.includes("weak")) {
      return "password_policy_failed";
    }
    return "form_password_incorrect";
  }

  if (raw.includes("captcha") || raw.includes("bot")) {
    return raw.includes("invalid") || raw.includes("failed")
      ? "captcha_invalid"
      : "captcha_required";
  }

  if (raw.includes("verification") || raw.includes("code")) {
    return "verification_code_invalid";
  }

  return raw;
}

function formatArchiveSyncResult(result: LocalArchiveScheduledSyncResult) {
  if (result.status === "completed") {
    return result.failed > 0
      ? `已同步 ${result.processed} 个文件，其中 ${result.failed} 个失败。`
      : `已同步 ${result.processed} 个文件。`;
  }

  if (result.status === "empty") {
    return "当前没有需要提前归档的图片。";
  }

  if (result.status === "failed") {
    return "本地归档同步失败，已安排稍后重试。";
  }

  if (result.status === "disabled") {
    return "本地归档已暂停。";
  }

  if (result.status === "not_configured") {
    return "请先选择本地归档目录。";
  }

  if (result.status === "bridge_missing") {
    return "当前桌面壳未提供本地归档桥。";
  }

  if (result.status === "skipped") {
    const labels: Record<string, string> = {
      bridge_missing: "当前桌面壳未提供本地归档桥。",
      disabled: "本地归档已暂停。",
      not_configured: "请先选择本地归档目录。",
      not_due: "还未到下一次自动归档时间。",
      waiting_for_retry: "上次同步失败，正在等待重试窗口。",
    };
    return labels[result.reason] || "本次归档已跳过。";
  }

  return "本地归档状态已更新。";
}

function getDesktopUpdateBridge() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__YEDIR_DESKTOP_UPDATES__ || null;
}

function normalizeDesktopUpdateString(value: unknown) {
  return String(value || "").trim();
}

function formatArchiveTime(value?: string | null) {
  if (!value) {
    return "尚未同步";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "尚未同步";
  }

  return date.toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

function formatProjectTime(value?: string | null) {
  if (!value) {
    return "最近更新";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "最近更新";
  }

  return date.toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}
