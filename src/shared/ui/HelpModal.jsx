/**
 * HelpModal — full-screen help sheet with multilingual content + Formspree contact form.
 * Triggered by the ❓ button in the header.
 */

import { memo, useState, useEffect, useRef } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

// ── Multilingual help content ─────────────────────────────────────────────────
export const HELP = {
  en: {
    title: "Help & Support",
    sections: [
      {
        heading: "Getting Started",
        body: "Tap any symbol on the Board to add it to your message. When your message is ready, press the green Speak button — the app will read it aloud. You can also type words directly in the message bar.",
      },
      {
        heading: "Symbol Board",
        body: "Tap a category pill to filter symbols. The ⚙️ gear next to categories lets you switch between icon+text, icon-only, or text-only display. Symbols you use often float to the top automatically.",
      },
      {
        heading: "Favourites",
        body: "Tap ★ while a message is in the bar to save it as a favourite. Manage your favourites (add, edit, reorder, delete) from the Favourites tab in the navigation.",
      },
      {
        heading: "Listen Mode",
        body: "Tap the 👂 ear icon in the header to activate Listen Mode. The app will listen for what someone says to you and suggest AAC replies. Tap a reply to speak it.",
      },
      {
        heading: "AI Prediction",
        body: "The bar below the message shows word suggestions powered by on-device AI. All processing stays on your device — no data is ever sent to the cloud.",
      },
      {
        heading: "Languages",
        body: "In Profile → Languages you can set separate languages for: the interface, symbol labels, voice output, and speech recognition.",
      },
      {
        heading: "Privacy",
        body: "SpeakEasy works 100% offline. No account is needed. Your history and settings are stored only on this device and can be deleted at any time from Profile → Data & Privacy.",
      },
    ],
    contactTitle: "Contact the Author",
    contactName: "Your name",
    contactEmail: "Your e-mail",
    contactMessage: "Your message…",
    contactSend: "Send message",
    contactSending: "Sending…",
    contactSuccess: "Message sent — thank you!",
    contactError: "Failed to send. Please try again.",
    restartOnboarding: "Restart setup wizard",
  },
  es: {
    title: "Ayuda y soporte",
    sections: [
      { heading: "Primeros pasos", body: "Toca un símbolo para añadirlo al mensaje. Cuando esté listo, pulsa el botón verde Hablar. También puedes escribir palabras directamente en la barra." },
      { heading: "Tablero de símbolos", body: "Toca una categoría para filtrar. El ⚙️ junto a las categorías permite cambiar entre icono+texto, solo icono o solo texto. Los símbolos más usados suben automáticamente." },
      { heading: "Favoritos", body: "Pulsa ★ con un mensaje en la barra para guardarlo. Gestiona tus favoritos (añadir, editar, reordenar, eliminar) desde la pestaña Favoritos." },
      { heading: "Modo escucha", body: "Toca el icono 👂 en el encabezado para activar el Modo escucha. La app escucha lo que alguien te dice y sugiere respuestas AAC. Toca una respuesta para hablarla." },
      { heading: "Predicción IA", body: "La barra bajo el mensaje muestra sugerencias de palabras con IA en el dispositivo. Ningún dato se envía a la nube." },
      { heading: "Idiomas", body: "En Perfil → Idiomas puedes configurar por separado: idioma de la interfaz, etiquetas de símbolos, voz y reconocimiento de voz." },
      { heading: "Privacidad", body: "SpeakEasy funciona 100% sin conexión. Sin cuenta. Tu historial se guarda solo en este dispositivo y puedes borrarlo en cualquier momento." },
    ],
    contactTitle: "Contactar al autor",
    contactName: "Tu nombre", contactEmail: "Tu correo", contactMessage: "Tu mensaje…",
    contactSend: "Enviar mensaje", contactSending: "Enviando…",
    contactSuccess: "¡Mensaje enviado, gracias!", contactError: "Error al enviar. Inténtalo de nuevo.",
    restartOnboarding: "Reiniciar asistente de configuración",
  },
  fr: {
    title: "Aide et support",
    sections: [
      { heading: "Démarrage", body: "Appuyez sur un symbole pour l'ajouter au message. Quand c'est prêt, appuyez sur le bouton vert Parler. Vous pouvez aussi taper des mots directement dans la barre." },
      { heading: "Tableau de symboles", body: "Appuyez sur une catégorie pour filtrer. L'icône ⚙️ permet de passer entre icône+texte, icône seule ou texte seul. Les symboles fréquents remontent automatiquement." },
      { heading: "Favoris", body: "Appuyez sur ★ pour sauvegarder un message en favori. Gérez vos favoris (ajouter, modifier, réordonner, supprimer) depuis l'onglet Favoris." },
      { heading: "Mode écoute", body: "Appuyez sur l'icône 👂 pour activer le Mode écoute. L'app écoute ce qu'on vous dit et propose des réponses CAA. Appuyez pour parler." },
      { heading: "Prédiction IA", body: "La barre sous le message affiche des suggestions basées sur une IA locale. Aucune donnée n'est envoyée dans le cloud." },
      { heading: "Langues", body: "Dans Profil → Langues, configurez séparément : langue de l'interface, étiquettes des symboles, voix et reconnaissance vocale." },
      { heading: "Confidentialité", body: "SpeakEasy fonctionne 100% hors ligne. Sans compte. Votre historique est stocké uniquement sur cet appareil." },
    ],
    contactTitle: "Contacter l'auteur",
    contactName: "Votre nom", contactEmail: "Votre e-mail", contactMessage: "Votre message…",
    contactSend: "Envoyer", contactSending: "Envoi…",
    contactSuccess: "Message envoyé — merci !", contactError: "Échec de l'envoi. Réessayez.",
    restartOnboarding: "Relancer l'assistant de configuration",
  },
  de: {
    title: "Hilfe & Support",
    sections: [
      { heading: "Erste Schritte", body: "Tippe auf ein Symbol, um es zur Nachricht hinzuzufügen. Drücke die grüne Sprechen-Taste, wenn die Nachricht fertig ist. Du kannst auch Wörter direkt in die Leiste eingeben." },
      { heading: "Symbol-Board", body: "Tippe auf eine Kategorie zum Filtern. Das ⚙️-Zahnrad erlaubt, zwischen Icon+Text, nur Icon oder nur Text umzuschalten. Häufig verwendete Symbole steigen automatisch auf." },
      { heading: "Favoriten", body: "Tippe ★, um eine Nachricht als Favorit zu speichern. Verwalte Favoriten (hinzufügen, bearbeiten, sortieren, löschen) im Favoriten-Tab." },
      { heading: "Hörmodus", body: "Tippe auf das 👂-Symbol im Header, um den Hörmodus zu aktivieren. Die App hört, was jemand sagt, und schlägt AAC-Antworten vor." },
      { heading: "KI-Vorhersage", body: "Die Leiste unter der Nachricht zeigt KI-Wortvorschläge direkt auf dem Gerät. Keine Daten gehen in die Cloud." },
      { heading: "Sprachen", body: "Unter Profil → Sprachen stellst du separat ein: Interface-Sprache, Symbol-Labels, Stimme und Spracherkennung." },
      { heading: "Datenschutz", body: "SpeakEasy funktioniert 100% offline. Kein Konto. Dein Verlauf wird nur auf diesem Gerät gespeichert." },
    ],
    contactTitle: "Autor kontaktieren",
    contactName: "Dein Name", contactEmail: "Deine E-Mail", contactMessage: "Deine Nachricht…",
    contactSend: "Nachricht senden", contactSending: "Sende…",
    contactSuccess: "Nachricht gesendet – danke!", contactError: "Fehler beim Senden. Bitte erneut versuchen.",
    restartOnboarding: "Einrichtungsassistenten neu starten",
  },
  it: {
    title: "Aiuto e supporto",
    sections: [
      { heading: "Per iniziare", body: "Tocca un simbolo per aggiungerlo al messaggio. Premi il pulsante verde Parla quando sei pronto. Puoi anche digitare parole direttamente nella barra." },
      { heading: "Tavola dei simboli", body: "Tocca una categoria per filtrare. L'icona ⚙️ permette di passare tra icona+testo, solo icona o solo testo. I simboli usati di frequente salgono automaticamente." },
      { heading: "Preferiti", body: "Premi ★ per salvare un messaggio come preferito. Gestisci i preferiti (aggiungere, modificare, riordinare, eliminare) dalla scheda Preferiti." },
      { heading: "Modalità ascolto", body: "Tocca l'icona 👂 nell'intestazione per attivare la Modalità ascolto. L'app ascolta ciò che ti viene detto e suggerisce risposte CAA." },
      { heading: "Previsione IA", body: "La barra sotto il messaggio mostra suggerimenti basati su IA locale. Nessun dato viene inviato al cloud." },
      { heading: "Lingue", body: "In Profilo → Lingue puoi impostare separatamente: lingua interfaccia, etichette simboli, voce e riconoscimento vocale." },
      { heading: "Privacy", body: "SpeakEasy funziona 100% offline. Nessun account. La cronologia è salvata solo su questo dispositivo." },
    ],
    contactTitle: "Contatta l'autore",
    contactName: "Il tuo nome", contactEmail: "La tua e-mail", contactMessage: "Il tuo messaggio…",
    contactSend: "Invia messaggio", contactSending: "Invio…",
    contactSuccess: "Messaggio inviato — grazie!", contactError: "Invio fallito. Riprova.",
    restartOnboarding: "Riavvia procedura guidata",
  },
  pt: {
    title: "Ajuda e suporte",
    sections: [
      { heading: "Começando", body: "Toque em um símbolo para adicioná-lo à mensagem. Pressione o botão verde Falar quando estiver pronto. Você também pode digitar palavras diretamente na barra." },
      { heading: "Quadro de símbolos", body: "Toque em uma categoria para filtrar. O ⚙️ ao lado das categorias permite alternar entre ícone+texto, só ícone ou só texto." },
      { heading: "Favoritos", body: "Pressione ★ para salvar uma mensagem como favorito. Gerencie favoritos (adicionar, editar, reordenar, excluir) na aba Favoritos." },
      { heading: "Modo ouvir", body: "Toque no ícone 👂 no cabeçalho para ativar o Modo ouvir. O app ouve o que alguém diz e sugere respostas CAA." },
      { heading: "Previsão IA", body: "A barra abaixo da mensagem mostra sugestões de IA local. Nenhum dado é enviado para a nuvem." },
      { heading: "Idiomas", body: "Em Perfil → Idiomas configure separadamente: idioma da interface, rótulos dos símbolos, voz e reconhecimento de fala." },
      { heading: "Privacidade", body: "O SpeakEasy funciona 100% offline. Sem conta. Seu histórico fica apenas neste dispositivo." },
    ],
    contactTitle: "Contatar o autor",
    contactName: "Seu nome", contactEmail: "Seu e-mail", contactMessage: "Sua mensagem…",
    contactSend: "Enviar mensagem", contactSending: "Enviando…",
    contactSuccess: "Mensagem enviada — obrigado!", contactError: "Falha ao enviar. Tente novamente.",
    restartOnboarding: "Reiniciar assistente de configuração",
  },
  ar: {
    title: "المساعدة والدعم",
    sections: [
      { heading: "البدء", body: "اضغط على رمز لإضافته إلى الرسالة. عند الجاهزية، اضغط زر التحدث الأخضر. يمكنك أيضًا كتابة الكلمات مباشرةً في الشريط." },
      { heading: "لوحة الرموز", body: "اضغط على فئة للتصفية. تتيح أيقونة ⚙️ التبديل بين أيقونة+نص، أيقونة فقط، أو نص فقط. الرموز الأكثر استخدامًا تظهر تلقائيًا في الأعلى." },
      { heading: "المفضلة", body: "اضغط ★ لحفظ رسالة كمفضلة. أدِر المفضلة (إضافة، تعديل، إعادة ترتيب، حذف) من علامة تبويب المفضلة." },
      { heading: "وضع الاستماع", body: "اضغط على أيقونة 👂 في الرأس لتفعيل وضع الاستماع. يستمع التطبيق لما يقوله شخص ما ويقترح ردودًا." },
      { heading: "التنبؤ بالذكاء الاصطناعي", body: "يعمل الذكاء الاصطناعي محليًا على جهازك. لا تُرسَل أي بيانات إلى الخادم." },
      { heading: "اللغات", body: "في الملف الشخصي → اللغات، يمكنك ضبط: لغة الواجهة، تسميات الرموز، الصوت، والتعرف على الكلام بشكل منفصل." },
      { heading: "الخصوصية", body: "يعمل SpeakEasy بالكامل دون اتصال. لا حساب مطلوب. تاريخك محفوظ على جهازك فقط." },
    ],
    contactTitle: "تواصل مع المؤلف",
    contactName: "اسمك", contactEmail: "بريدك الإلكتروني", contactMessage: "رسالتك…",
    contactSend: "إرسال الرسالة", contactSending: "جارٍ الإرسال…",
    contactSuccess: "تم إرسال الرسالة — شكرًا!", contactError: "فشل الإرسال. حاول مجددًا.",
    restartOnboarding: "إعادة تشغيل معالج الإعداد",
  },
  zh: {
    title: "帮助与支持",
    sections: [
      { heading: "入门", body: "点击符号将其添加到消息中。准备好后，按绿色【说话】按钮朗读消息。也可以在消息栏中直接输入文字。" },
      { heading: "符号板", body: "点击分类标签过滤符号。⚙️ 图标可切换【图标+文字】、【仅图标】或【仅文字】模式。常用符号会自动排到顶部。" },
      { heading: "收藏夹", body: "消息栏有内容时点击 ★ 可保存为收藏。在【收藏】标签页管理收藏（添加、编辑、排序、删除）。" },
      { heading: "聆听模式", body: "点击标题栏的 👂 图标启动聆听模式。应用会聆听对方说的话并建议 AAC 回复，点击回复即可朗读。" },
      { heading: "AI 预测", body: "消息栏下方显示本地 AI 提供的词语建议。所有处理均在设备本地完成，不上传任何数据。" },
      { heading: "语言", body: "在【个人资料 → 语言】中，可分别设置：界面语言、符号标签语言、语音语言和语音识别语言。" },
      { heading: "隐私", body: "SpeakEasy 完全离线运行，无需账户。历史记录仅存储在本设备上，可随时删除。" },
    ],
    contactTitle: "联系作者",
    contactName: "您的姓名", contactEmail: "您的邮箱", contactMessage: "您的留言…",
    contactSend: "发送消息", contactSending: "发送中…",
    contactSuccess: "消息已发送——谢谢！", contactError: "发送失败，请重试。",
    restartOnboarding: "重新启动设置向导",
  },
  ja: {
    title: "ヘルプとサポート",
    sections: [
      { heading: "はじめに", body: "シンボルをタップしてメッセージに追加します。準備ができたら緑の「話す」ボタンを押してください。メッセージバーに直接入力することもできます。" },
      { heading: "シンボルボード", body: "カテゴリをタップしてフィルタリングします。⚙️ アイコンでアイコン+テキスト・アイコンのみ・テキストのみを切り替えられます。よく使うシンボルは自動で上位に表示されます。" },
      { heading: "お気に入り", body: "メッセージをお気に入りに保存するには ★ をタップします。お気に入りタブで追加・編集・並び替え・削除ができます。" },
      { heading: "聞くモード", body: "ヘッダーの 👂 アイコンをタップして聞くモードを起動します。アプリは相手の言葉を聞いてAAC返答を提案します。" },
      { heading: "AI予測", body: "メッセージバー下のバーがデバイス上のAIによる単語候補を表示します。データはクラウドに送信されません。" },
      { heading: "言語", body: "プロフィール → 言語で、インターフェース言語・シンボルラベル・音声・音声認識をそれぞれ個別に設定できます。" },
      { heading: "プライバシー", body: "SpeakEasyは完全オフラインで動作します。アカウント不要。履歴はこのデバイスにのみ保存されます。" },
    ],
    contactTitle: "作者に連絡",
    contactName: "お名前", contactEmail: "メールアドレス", contactMessage: "メッセージ…",
    contactSend: "メッセージを送る", contactSending: "送信中…",
    contactSuccess: "送信しました。ありがとうございます！", contactError: "送信に失敗しました。再試行してください。",
    restartOnboarding: "セットアップウィザードを再起動",
  },
  ko: {
    title: "도움말 및 지원",
    sections: [
      { heading: "시작하기", body: "기호를 탭하여 메시지에 추가하세요. 준비가 되면 녹색 말하기 버튼을 누르세요. 메시지 바에 직접 입력할 수도 있습니다." },
      { heading: "기호 보드", body: "카테고리를 탭하여 필터링하세요. ⚙️ 아이콘으로 아이콘+텍스트, 아이콘만, 텍스트만 모드를 전환할 수 있습니다. 자주 사용하는 기호는 자동으로 위로 올라옵니다." },
      { heading: "즐겨찾기", body: "메시지를 즐겨찾기로 저장하려면 ★을 탭하세요. 즐겨찾기 탭에서 추가·편집·정렬·삭제를 관리하세요." },
      { heading: "듣기 모드", body: "헤더의 👂 아이콘을 탭하여 듣기 모드를 활성화하세요. 앱이 상대방의 말을 듣고 AAC 답변을 제안합니다." },
      { heading: "AI 예측", body: "메시지 바 아래 표시줄이 기기 내 AI 단어 제안을 보여줍니다. 데이터는 클라우드로 전송되지 않습니다." },
      { heading: "언어", body: "프로필 → 언어에서 인터페이스 언어, 기호 레이블, 음성, 음성 인식을 각각 개별 설정할 수 있습니다." },
      { heading: "개인정보", body: "SpeakEasy는 100% 오프라인으로 작동합니다. 계정 불필요. 기록은 이 장치에만 저장됩니다." },
    ],
    contactTitle: "작성자에게 연락",
    contactName: "이름", contactEmail: "이메일", contactMessage: "메시지…",
    contactSend: "메시지 보내기", contactSending: "전송 중…",
    contactSuccess: "메시지가 전송되었습니다. 감사합니다!", contactError: "전송 실패. 다시 시도하세요.",
    restartOnboarding: "설정 마법사 다시 시작",
  },
};

// ── Accordion section ─────────────────────────────────────────────────────────
function Section({ heading, body }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: "var(--surface)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", border: "none", background: "transparent",
          cursor: "pointer", WebkitTapHighlightColor: "transparent",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", textAlign: "left" }}>
          {heading}
        </span>
        {open
          ? <ChevronUp  size={16} strokeWidth={2} style={{ color: "var(--text-3)", flexShrink: 0 }} />
          : <ChevronDown size={16} strokeWidth={2} style={{ color: "var(--text-3)", flexShrink: 0 }} />
        }
      </button>
      {open && (
        <div style={{
          padding: "0 16px 16px",
          fontSize: 14, color: "var(--text-2)", lineHeight: 1.6,
          animation: "fadeUp 0.15s ease both",
        }}>
          {body}
        </div>
      )}
    </div>
  );
}

// ── HelpModal ─────────────────────────────────────────────────────────────────
export default memo(function HelpModal({ onClose, langCode = "en", onResetOnboarding }) {
  const t = HELP[langCode] ?? HELP.en;
  const isRtl = langCode === "ar";
  const sheetRef = useRef(null);

  /* Escape to dismiss + focus trap */
  useEffect(() => {
    const el = sheetRef.current;
    if (el) el.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && el) {
        const focusable = el.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
        if (focusable.length === 0) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-end",
        animation: "fadeIn 0.18s ease both",
      }}
    >
      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        dir={isRtl ? "rtl" : "ltr"}
        style={{
          width: "100%",
          maxHeight: "90vh",
          background: "var(--bg)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          animation: "slideUp 0.25s cubic-bezier(0.32,0.72,0,1) both",
        }}
      >
        {/* ── Sticky header ── */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "14px 16px 12px",
          borderBottom: "0.5px solid var(--sep)",
          flexShrink: 0,
          background: "var(--surface)",
        }}>
          {/* Drag handle */}
          <div style={{
            position: "absolute", left: "50%", top: 8,
            transform: "translateX(-50%)",
            width: 36, height: 4, borderRadius: 2,
            background: "var(--sep)",
          }} />
          <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
            {t.title}
          </span>
          <button
            onClick={onClose}
            aria-label="Close help"
            style={{
              width: 44, height: 44,
              borderRadius: "50%",
              border: "none",
              background: "var(--elevated)",
              color: "var(--text-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "16px 14px 40px",
          display: "flex", flexDirection: "column", gap: 8,
        }}>

          {/* Help sections */}
          {t.sections.map((s, i) => (
            <Section key={i} heading={s.heading} body={s.body} />
          ))}

          {/* Restart onboarding */}
          {onResetOnboarding && (
            <button
              onClick={() => { onResetOnboarding(); onClose(); }}
              style={{
                width: "100%", marginTop: 8,
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--sep)",
                background: "var(--surface)",
                color: "var(--tint, #3B9B8F)",
                fontSize: 15, fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ fontSize: 18 }}>🧭</span>
              {t.restartOnboarding ?? "Restart setup wizard"}
            </button>
          )}

          {/* Version note */}
          <p style={{
            textAlign: "center", fontSize: 11, color: "var(--text-4)",
            marginTop: 8, fontWeight: 500,
          }}>
            SpeakEasy · Open Source AAC
          </p>
        </div>
      </div>
    </div>
  );
});
