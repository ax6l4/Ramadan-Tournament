/**
 * لوحة تحكم الأدمن
 * إدارة التسجيل، اللاعبين، الإعدادات، والتصدير
 */

document.addEventListener('DOMContentLoaded', async () => {
  const token = getAdminToken();
  if (!token) {
    window.location.href = './login.html';
    return;
  }

  const alertBox = document.getElementById('dashboard-alert');
  const playersBody = document.getElementById('players-body');
  const searchInput = document.getElementById('search-input');
  const countEl = document.getElementById('stat-count');
  const leadersEl = document.getElementById('stat-leaders');
  const footballEl = document.getElementById('stat-football');
  const volleyballEl = document.getElementById('stat-volleyball');
  const registrationToggle = document.getElementById('registration-open');
  const closedMessageInput = document.getElementById('closed-message-input');
  const siteTitleInput = document.getElementById('site-title-input');
  const adminEmailEl = document.getElementById('admin-email');
  const siteStatusLabel = document.getElementById('site-status-label');
  const openSiteBtn = document.getElementById('open-site-btn');
  const lockSiteBtn = document.getElementById('lock-site-btn');

  adminEmailEl.textContent = localStorage.getItem('admin_email') || 'أدمن';

  // التحقق من صلاحية الجلسة
  try {
    await apiRequest('/auth/me', { headers: authHeaders() });
  } catch (error) {
    clearAdminSession();
    window.location.href = './login.html';
    return;
  }

  await Promise.all([loadSettings(), loadPlayers()]);

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearAdminSession();
    window.location.href = './login.html';
  });

  document.getElementById('save-settings-btn')?.addEventListener('click', saveSettings);

  // فتح / قفل الموقع مباشرة
  openSiteBtn?.addEventListener('click', () => setSiteOpen(true));
  lockSiteBtn?.addEventListener('click', () => setSiteOpen(false));

  document.getElementById('search-btn')?.addEventListener('click', () => {
    loadPlayers(searchInput.value.trim());
  });

  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      loadPlayers(searchInput.value.trim());
    }
  });

  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    searchInput.value = '';
    loadPlayers();
  });

  document.getElementById('export-btn')?.addEventListener('click', downloadPlayersFile);

  document.getElementById('delete-all-btn')?.addEventListener('click', async () => {
    const confirmed = window.confirm('هل أنت متأكد من حذف جميع اللاعبين؟');
    if (!confirmed) return;

    try {
      await apiRequest('/players', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      showAlert(alertBox, 'تم حذف جميع اللاعبين', 'success');
      await loadPlayers();
    } catch (error) {
      showAlert(alertBox, error.message, 'error');
    }
  });

  const manualNameInput = document.getElementById('manual_full_name');
  const manualNameHint = document.getElementById('manual-name-hint');

  manualNameInput?.addEventListener('input', () => {
    if (!manualNameHint) return;
    const raw = String(manualNameInput.value || '');
    manualNameHint.classList.remove('is-ok', 'is-error');
    if (!raw.trim()) {
      manualNameHint.textContent = 'اكتب الاسم الكامل من خمسة أسماء عربية';
      return;
    }
    const result = ArabicNameValidator.validateArabicPersonName(raw);
    manualNameHint.textContent = result.valid ? 'الاسم صحيح' : result.message;
    manualNameHint.classList.toggle('is-ok', result.valid);
    manualNameHint.classList.toggle('is-error', !result.valid);
  });

  document.getElementById('manual-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlert(alertBox);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nameCheck = ArabicNameValidator.validateArabicPersonName(
      String(formData.get('full_name') || '')
    );

    if (!nameCheck.valid) {
      showAlert(alertBox, nameCheck.message, 'error');
      return;
    }

    const payload = {
      full_name: nameCheck.value,
      phone: String(formData.get('phone') || '').trim(),
      is_team_leader: formData.get('is_team_leader') === 'yes',
      sport: String(formData.get('sport') || ''),
    };

    try {
      await apiRequest('/players', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      form.reset();
      showAlert(alertBox, 'تمت إضافة اللاعب يدوياً', 'success');
      await loadPlayers(searchInput.value.trim());
    } catch (error) {
      showAlert(alertBox, error.message, 'error');
    }
  });

  /**
   * تحميل الإعدادات
   */
  async function loadSettings() {
    try {
      const result = await apiRequest('/settings', { headers: authHeaders() });
      const settings = result.data.settings;
      const isOpen = settings.registration_open?.value === '1';

      registrationToggle.checked = isOpen;
      closedMessageInput.value = settings.registration_closed_message?.value || '';
      siteTitleInput.value = settings.site_title?.value || '';
      updateSiteStatusUI(isOpen);
    } catch (error) {
      showAlert(alertBox, error.message, 'error');
    }
  }

  /**
   * تحديث واجهة حالة الموقع (مفتوح / مقفول)
   */
  function updateSiteStatusUI(isOpen) {
    registrationToggle.checked = isOpen;

    if (siteStatusLabel) {
      siteStatusLabel.textContent = isOpen ? 'مفتوح للتسجيل' : 'مقفل';
      siteStatusLabel.classList.toggle('is-open', isOpen);
      siteStatusLabel.classList.toggle('is-locked', !isOpen);
    }

    if (openSiteBtn) openSiteBtn.disabled = isOpen;
    if (lockSiteBtn) lockSiteBtn.disabled = !isOpen;
  }

  /**
   * فتح أو قفل الموقع فوراً
   */
  async function setSiteOpen(isOpen) {
    hideAlert(alertBox);

    try {
      await apiRequest('/settings', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ registration_open: isOpen }),
      });

      updateSiteStatusUI(isOpen);
      showAlert(
        alertBox,
        isOpen ? 'تم فتح الموقع للتسجيل' : 'تم قفل الموقع',
        'success'
      );
    } catch (error) {
      showAlert(alertBox, error.message, 'error');
    }
  }

  /**
   * حفظ الإعدادات
   */
  async function saveSettings() {
    hideAlert(alertBox);

    try {
      await apiRequest('/settings', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          registration_open: registrationToggle.checked,
          registration_closed_message: closedMessageInput.value.trim(),
          site_title: siteTitleInput.value.trim(),
        }),
      });
      updateSiteStatusUI(registrationToggle.checked);
      showAlert(alertBox, 'تم حفظ الإعدادات', 'success');
    } catch (error) {
      showAlert(alertBox, error.message, 'error');
    }
  }

  /**
   * تحميل اللاعبين وعرضهم
   */
  async function loadPlayers(search = '') {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const result = await apiRequest(`/players${query}`, {
        headers: authHeaders(),
      });

      const players = result.data.players || [];
      renderPlayers(players);
      updateStats(players);
    } catch (error) {
      showAlert(alertBox, error.message, 'error');
    }
  }

  /**
   * رسم جدول اللاعبين
   */
  function renderPlayers(players) {
    if (!playersBody) return;

    if (players.length === 0) {
      playersBody.innerHTML =
        '<tr><td colspan="7">لا يوجد لاعبون مسجلون حالياً</td></tr>';
      return;
    }

    playersBody.innerHTML = players
      .map((player, index) => {
        const leaderMark = player.is_team_leader
          ? '<span class="mark-yes">✓</span>'
          : '<span class="mark-no">✗</span>';
        const footballMark = player.plays_football
          ? '<span class="mark-yes">✓</span>'
          : '<span class="mark-no">✗</span>';
        const volleyballMark = player.plays_volleyball
          ? '<span class="mark-yes">✓</span>'
          : '<span class="mark-no">✗</span>';

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(player.full_name)}</td>
            <td>${escapeHtml(player.phone)}</td>
            <td>${leaderMark}</td>
            <td>${footballMark}</td>
            <td>${volleyballMark}</td>
            <td>
              <button class="btn btn--danger" type="button" data-delete="${player.id}">
                حذف
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    playersBody.querySelectorAll('[data-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.getAttribute('data-delete');
        const confirmed = window.confirm('حذف هذا اللاعب؟');
        if (!confirmed) return;

        try {
          await apiRequest(`/players/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
          });
          showAlert(alertBox, 'تم حذف اللاعب', 'success');
          await loadPlayers(searchInput.value.trim());
        } catch (error) {
          showAlert(alertBox, error.message, 'error');
        }
      });
    });
  }

  /**
   * تحديث الإحصاءات السريعة
   */
  function updateStats(players) {
    countEl.textContent = String(players.length);
    leadersEl.textContent = String(players.filter((p) => p.is_team_leader).length);
    footballEl.textContent = String(players.filter((p) => p.plays_football).length);
    volleyballEl.textContent = String(
      players.filter((p) => p.plays_volleyball).length
    );
  }

  /**
   * Downloads the server-generated Word report. Binary responses are
   * fetched directly because the JSON API helper cannot parse .docx files.
   */
  async function downloadPlayersFile() {
    try {
      const response = await fetch('/api/players/export/docx', {
        headers: authHeaders(),
      });

      if (!response.ok) {
        let message = 'تعذر تنزيل ملف Word';
        try {
          const payload = await response.json();
          message = payload.message || message;
        } catch (parseError) {
          // Keep the fallback message when the body is not JSON.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const dateStamp = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ramadan-tournament-players-${dateStamp}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      showAlert(alertBox, 'تم تنزيل ملف Word على جهازك', 'success');
    } catch (error) {
      showAlert(alertBox, error.message, 'error');
    }
  }

  /**
   * حماية من XSS عند عرض النصوص
   */
  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
});
