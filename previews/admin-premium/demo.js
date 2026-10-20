// Entirely fictional demo records. Reloading discards all local changes.
(() => {
  const now = new Date();
  const names = ['Ayaan Mir', 'Sara Khan', 'Zoya Shah', 'Rayyan Dar', 'Inaya Wani', 'Arham Bhat', 'Mahira Lone', 'Danish Malik'];
  const courses = ['One Year Computer Diploma Course', 'Six Month Computer Certificate Course', 'Tally Prime with GST — Detailed Course'];
  const records = {};
  names.forEach((name, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (index % 5), 12));
    records['demo-' + index] = {
      fullName: name, parentName: 'Demo Guardian', phone: '90000000' + String(index).padStart(2, '0'),
      email: 'student' + index + '@example.test', gender: index % 2 ? 'female' : 'male',
      address: 'Sample address · Charangam, Beerwah', dob: '2005-03-12', qualification: '12th',
      coursePreference: courses[index % courses.length], batch: ['Morning', 'Afternoon', 'Evening'][index % 3],
      status: index < 6 ? 'Approved' : 'New', source: index % 2 ? 'Institute — offline enrolment' : 'Website',
      channel: index % 2 ? 'offline' : 'online', createdAt: date.toISOString(),
      payment: {status: index < 6 ? 'paid' : 'at_centre', amount: 100, verified: index < 6},
      photo: '', message: 'Fictional sample record for the design preview.', monthlyFees: {}, feeReminders: {}
    };
    if (index < 6) Object.assign(records['demo-' + index], {
      admissionNumber: String(index + 1).padStart(3, '0'), rollNumber: String(index + 1).padStart(3, '0'),
      admissionDate: date.toISOString().slice(0, 10), approvedAt: date.toISOString()
    });
  });
  // Fictional examples make shared-family contact and missing-detail review visible.
  records['demo-6'].guardianPhone = '9000000099';
  records['demo-6'].parentName = '';
  records['demo-7'].phone = records['demo-6'].phone;
  records['demo-7'].coursePreference = '';
  records['demo-0'].customLegacyField = {retained: true};
  const user = {uid: 'preview-admin', email: 'preview@rehaan.example', getIdToken: async () => 'local-preview-only'};
  window.__adminPreview = {records, writes: [], listeners: [], user, auth: {currentUser: user, authStateReady: async () => {}}};
  window.emailjs = {init() {}, async send() { throw Error('Email sending is disabled in this preview. No message was sent.'); }};
  const notify = () => alert('Preview only. No WhatsApp message, email or live request has been sent.');
  const nativeOpen = window.open.bind(window);
  window.open = url => {
    if (!url || new URL(url, location.href).origin !== location.origin) { notify(); return null; }
    return nativeOpen(url);
  };
  // No outbound navigation or share request can send sample data to a real person.
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href]');
    if (anchor && new URL(anchor.href, location.href).origin !== location.origin && !anchor.href.startsWith('blob:')) {
      event.preventDefault(); event.stopImmediatePropagation(); notify();
    }
  }, true);
  if (navigator.share) navigator.share = async () => { notify(); throw new DOMException('Preview only', 'AbortError'); };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#demoReset').addEventListener('click', () => location.reload());
    const button = document.querySelector('#adminLoginButton');
    const enterDemo = () => {
      if (button.disabled) return;
      ready.disconnect();
      document.querySelector('#adminEmail').value = 'preview@rehaan.example';
      document.querySelector('#adminPassword').value = 'demo-preview';
      document.querySelector('#adminLoginForm').requestSubmit();
    };
    const ready = new MutationObserver(enterDemo);
    ready.observe(button, {attributes: true, attributeFilter: ['disabled']});
    enterDemo();
    const date = document.querySelector('#workspaceDate');
    date.textContent = new Intl.DateTimeFormat('en-IN', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'}).format(now);
    const refreshAvatars = () => document.querySelectorAll('.application-card .row-photo:not(:has(img))').forEach(photo => {
      if (photo.querySelector('.demo-initials')) return;
      const name = photo.closest('.application-card').querySelector('.row-line1 h3')?.textContent || 'RC';
      const initials = document.createElement('span'); initials.className = 'demo-initials';
      initials.textContent = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('');
      photo.replaceChildren(initials);
    });
    new MutationObserver(refreshAvatars).observe(document.querySelector('#applicationsList'), {childList: true, subtree: true});
    refreshAvatars();
  });
})();

// Presentation tools call the existing controls; no new persistence paths.
document.addEventListener('DOMContentLoaded', () => {
  const find = document.createElement('dialog');
  find.className = 'workspace-finder';
  find.setAttribute('aria-labelledby', 'finderTitle');
  find.innerHTML = `<form method="dialog"><div class="finder-heading"><div><span>YOUR WORKSPACE, WITHIN REACH</span><h2 id="finderTitle">What would you like to open?</h2></div><button aria-label="Close quick search">×</button></div></form><label class="finder-label" for="finderQuery">Find a student or dashboard section</label><input id="finderQuery" type="search" autocomplete="off" placeholder="Try a student name, Fees or Mark Cards…"><div class="finder-results" id="finderResults"></div><p>Search your register by name, phone or admission number. <kbd>Esc</kbd> to close.</p>`;
  document.body.append(find);
  const search = find.querySelector('#finderQuery');
  const results = find.querySelector('#finderResults');
  const sections = [...document.querySelectorAll('.nav [data-section]')];
  function studentSearch() {
    const value = search.value.trim();
    find.close();
    document.querySelector('[data-section=students]').click();
    // All records includes pending applications as well as enrolled students.
    document.querySelector('[data-tab=all]').click();
    const input = document.querySelector('#adminSearch');
    input.value = value;
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.scrollIntoView({block: 'center'});input.focus();
  }
  function renderResults() {
    results.replaceChildren();
    const query = search.value.trim().toLowerCase();
    if (query) {
      const student = document.createElement('button');student.type = 'button';
      const strong = document.createElement('strong');strong.textContent = 'Search student register';
      const hint = document.createElement('small');hint.textContent = 'Find “' + search.value.trim() + '” across all records →';
      student.append(strong, hint);student.onclick = studentSearch;results.append(student);
    }
    sections.filter(button => !query || button.textContent.toLowerCase().includes(query)).forEach(section => {
      const button = document.createElement('button');button.type = 'button';
      button.textContent = section.textContent.trim();
      button.addEventListener('click', () => {find.close();section.click();});results.append(button);
    });
  }
  function openFind() {
    if (document.querySelector('#adminDashboard').style.display === 'none' || document.querySelector('dialog[open], .admin-modal:not([hidden]), .admin-lightbox:not([hidden])')) return;
    search.value = '';renderResults();find.showModal();search.focus();
  }
  document.querySelector('#workspaceFind').addEventListener('click', openFind);
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {event.preventDefault();openFind();}
  });
  search.addEventListener('input', renderResults);
  search.addEventListener('keydown', event => {
    if (event.key === 'Enter' && search.value.trim()) {event.preventDefault();studentSearch();}
    if (event.key === 'ArrowDown') {event.preventDefault();results.querySelector('button')?.focus();}
  });
  find.addEventListener('click', event => {
    if (event.target === find) {
      const rect = find.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) find.close();
    }
  });
  const controls = document.createElement('div');controls.className = 'register-layout';controls.setAttribute('role', 'group');controls.setAttribute('aria-label', 'Student register layout');
  const label = document.createElement('span');label.textContent = 'REGISTER VIEW';controls.append(label);
  for (const [id, text] of [['list', 'List'], ['cards', 'Cards']]) {
    const button = document.createElement('button');button.type = 'button';button.textContent = text;button.dataset.registerLayout = id;button.setAttribute('aria-pressed', String(id === 'list'));
    button.onclick = () => {
      document.querySelector('#applicationsList').classList.toggle('register-cards', id === 'cards');
      controls.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    };controls.append(button);
  }
  document.querySelector('.applications-title').append(controls);
});
