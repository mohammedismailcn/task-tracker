/**
 * Zenith Task Tracker, Notepad & Sketchpad Application
 * Core JS Architecture & Event Handling
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Initialization ---
    let state = {
        tasks: JSON.parse(localStorage.getItem('zenith_tasks')) || [],
        notes: JSON.parse(localStorage.getItem('zenith_notes')) || [],
        drawings: JSON.parse(localStorage.getItem('zenith_drawings')) || [],
        settings: JSON.parse(localStorage.getItem('zenith_settings')) || {
            defaultSound: 'chime',
            volume: 0.7,
            alertDuration: 30, // seconds
            theme: 'default'
        },
        activeNoteId: null,
        activeTab: 'dashboard',
        activeAlarmTaskId: null
    };

    // --- Audio System (Web Audio API Synthesizer) ---
    let audioCtx = null;
    let alarmPlayInterval = null;
    let alarmTimeoutId = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function checkAutoplayPermission() {
        // Modern browsers block audio until user interaction
        let tempCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (tempCtx.state === 'suspended') {
            document.getElementById('audio-unlock-banner').classList.remove('hidden');
        }
        tempCtx.close();
    }

    document.getElementById('unlock-audio-btn').addEventListener('click', () => {
        initAudio();
        document.getElementById('audio-unlock-banner').classList.add('hidden');
        // Play a soft test chime
        playAlertSound(state.settings.defaultSound, 0.2);
    });

    function playAlertSound(soundType, customVolume = null) {
        initAudio();
        if (!audioCtx) return;

        let volume = customVolume !== null ? customVolume : state.settings.volume;
        let mainGain = audioCtx.createGain();
        mainGain.gain.setValueAtTime(volume, audioCtx.currentTime);
        mainGain.connect(audioCtx.destination);

        let now = audioCtx.currentTime;

        if (soundType === 'chime') {
            // Harmonic Zen Chime
            let osc = audioCtx.createOscillator();
            let gainNode = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
            
            gainNode.gain.setValueAtTime(0.8, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
            
            osc.connect(gainNode);
            gainNode.connect(mainGain);
            osc.start(now);
            osc.stop(now + 1.5);
        } else if (soundType === 'beep') {
            // Digital Double Beep
            for (let i = 0; i < 2; i++) {
                let osc = audioCtx.createOscillator();
                let gainNode = audioCtx.createGain();
                let start = now + (i * 0.22);
                
                osc.type = 'square';
                osc.frequency.setValueAtTime(1900, start);
                
                gainNode.gain.setValueAtTime(0.25, start);
                gainNode.gain.setValueAtTime(0.001, start + 0.08);
                
                osc.connect(gainNode);
                gainNode.connect(mainGain);
                osc.start(start);
                osc.stop(start + 0.1);
            }
        } else if (soundType === 'urgent') {
            // Urgent Warning Pulse
            let osc = audioCtx.createOscillator();
            let gainNode = audioCtx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.linearRampToValueAtTime(900, now + 0.25);
            osc.frequency.linearRampToValueAtTime(450, now + 0.5);
            
            gainNode.gain.setValueAtTime(0.35, now);
            gainNode.gain.linearRampToValueAtTime(0.35, now + 0.4);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            osc.connect(gainNode);
            gainNode.connect(mainGain);
            osc.start(now);
            osc.stop(now + 0.51);
        } else if (soundType === 'melody') {
            // Relaxing Melody Chime (Arpeggio)
            let notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
            notes.forEach((freq, idx) => {
                let osc = audioCtx.createOscillator();
                let gainNode = audioCtx.createGain();
                let start = now + (idx * 0.18);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, start);
                
                gainNode.gain.setValueAtTime(0.5, start);
                gainNode.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
                
                osc.connect(gainNode);
                gainNode.connect(mainGain);
                osc.start(start);
                osc.stop(start + 0.55);
            });
        }
    }

    function startLoopingAlarm(soundType) {
        stopLoopingAlarm(); // Safety clear
        initAudio();
        
        let intervalTime = (soundType === 'urgent') ? 600 : 1800;
        
        // Play once immediately
        playAlertSound(soundType);
        
        alarmPlayInterval = setInterval(() => {
            playAlertSound(soundType);
        }, intervalTime);

        // Auto mute timeout
        let durationMs = state.settings.alertDuration * 1000;
        alarmTimeoutId = setTimeout(() => {
            stopLoopingAlarm();
            showAutomutedNotification();
        }, durationMs);
    }

    function stopLoopingAlarm() {
        if (alarmPlayInterval) {
            clearInterval(alarmPlayInterval);
            alarmPlayInterval = null;
        }
        if (alarmTimeoutId) {
            clearTimeout(alarmTimeoutId);
            alarmTimeoutId = null;
        }
    }

    function showAutomutedNotification() {
        const titleEl = document.querySelector('.alarm-title');
        if (titleEl) {
            titleEl.textContent = "Alarm Sound Timeout";
            titleEl.style.color = "var(--text-secondary)";
        }
    }


    // --- State Persistence Helpers ---
    function saveTasks() {
        localStorage.setItem('zenith_tasks', JSON.stringify(state.tasks));
    }
    function saveNotes() {
        localStorage.setItem('zenith_notes', JSON.stringify(state.notes));
    }
    function saveDrawings() {
        localStorage.setItem('zenith_drawings', JSON.stringify(state.drawings));
    }
    function saveSettings() {
        localStorage.setItem('zenith_settings', JSON.stringify(state.settings));
    }


    // --- Theme & Setup Initialization ---
    function initTheme() {
        document.body.className = ''; // clear
        document.body.classList.add(`theme-${state.settings.theme}`);
        
        // Update settings panel active swatch
        document.querySelectorAll('.theme-swatch').forEach(swatch => {
            swatch.classList.remove('active');
            if (swatch.dataset.theme === state.settings.theme) {
                swatch.classList.add('active');
            }
        });
    }

    // Apply Saved Settings to fields
    function initSettingsFields() {
        document.getElementById('settings-default-sound').value = state.settings.defaultSound;
        document.getElementById('settings-volume').value = state.settings.volume;
        document.getElementById('settings-alert-duration').value = state.settings.alertDuration;
    }


    // --- Time Display ---
    function updateClock() {
        const now = new Date();
        // Format Time
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        document.getElementById('sidebar-time').textContent = `${hours}:${minutes} ${ampm}`;
        
        // Format Date
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        document.getElementById('sidebar-date').textContent = now.toLocaleDateString('en-US', options);
    }
    setInterval(updateClock, 1000);
    updateClock();


    // --- View Tab Navigation ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.app-view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.dataset.tab;
            switchTab(targetTab);
        });
    });

    function switchTab(tabId) {
        state.activeTab = tabId;
        
        // Update sidebar items
        navItems.forEach(nav => {
            nav.classList.remove('active');
            if (nav.dataset.tab === tabId) nav.classList.add('active');
        });

        // Toggle visibility
        views.forEach(view => {
            view.classList.remove('active');
            if (view.id === `view-${tabId}`) {
                view.classList.add('active');
            }
        });

        // Trigger tab specific actions
        if (tabId === 'dashboard') {
            renderDashboard();
        } else if (tabId === 'tasks') {
            renderTasks();
        } else if (tabId === 'notepad') {
            renderNotesList();
            renderActiveNote();
        } else if (tabId === 'drawboard') {
            // Resize canvas context layout wrapper on display
            resizeCanvas();
        }
    }


    // --- Dashboard Controller ---
    function renderDashboard() {
        const total = state.tasks.length;
        const completed = state.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        
        // Overdue count
        const now = Date.now();
        const overdue = state.tasks.filter(t => !t.completed && t.deadline < now).length;

        // Progress Circular Ring
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        document.getElementById('dashboard-progress-percentage').textContent = `${percentage}%`;
        document.getElementById('dashboard-tasks-completed').textContent = `${completed} / ${total} Tasks Completed`;
        
        const ring = document.getElementById('dashboard-progress-ring');
        // SVG circle perimeter is 2 * PI * r = 2 * 3.14159 * 50 = 314
        const strokeDashoffset = 314 - (percentage / 100) * 314;
        ring.style.strokeDasharray = '314';
        ring.style.strokeDashoffset = strokeDashoffset;

        // Stat Numbers
        document.getElementById('dashboard-pending-count').textContent = pending;
        document.getElementById('dashboard-overdue-count').textContent = overdue;
        document.getElementById('dashboard-notes-count').textContent = state.notes.length;
        document.getElementById('dashboard-drawings-count').textContent = state.drawings.length;

        // Dashboard Lists
        renderDashboardUpcomingList();
        renderDashboardNoteWidget();
    }

    function renderDashboardUpcomingList() {
        const container = document.getElementById('dashboard-upcoming-list');
        container.innerHTML = '';

        const now = Date.now();
        // Filter pending tasks sorted by deadline
        const upcomingTasks = state.tasks
            .filter(t => !t.completed && t.deadline >= now)
            .sort((a, b) => a.deadline - b.deadline)
            .slice(0, 5);

        if (upcomingTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-circle-check"></i>
                    <p>No upcoming deadlines!</p>
                </div>
            `;
            return;
        }

        upcomingTasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'upcoming-item';

            const dlDate = new Date(task.deadline);
            const dateStr = dlDate.toLocaleDateString() + ' ' + dlDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const diff = task.deadline - now;
            let countdownStr = '';
            let imminent = false;

            const mins = Math.floor(diff / 60000);
            const hrs = Math.floor(mins / 60);
            const days = Math.floor(hrs / 24);

            if (days > 0) {
                countdownStr = `in ${days}d`;
            } else if (hrs > 0) {
                countdownStr = `in ${hrs}h ${mins % 60}m`;
            } else {
                countdownStr = `in ${mins}m`;
                imminent = true; // less than an hour
            }

            item.innerHTML = `
                <div class="upcoming-details">
                    <span class="upcoming-title">${escapeHTML(task.title)}</span>
                    <span class="upcoming-time"><i class="fa-regular fa-calendar-days"></i> ${dateStr}</span>
                </div>
                <span class="upcoming-countdown ${imminent ? 'imminent' : ''}">${countdownStr}</span>
            `;
            container.appendChild(item);
        });
    }

    function renderDashboardNoteWidget() {
        const container = document.getElementById('dashboard-note-widget');
        container.innerHTML = '';

        if (state.notes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-file-pen"></i>
                    <p>No notes written yet.</p>
                </div>
            `;
            return;
        }

        // Get most recently modified note
        const latestNote = [...state.notes].sort((a, b) => b.updatedAt - a.updatedAt)[0];

        const box = document.createElement('div');
        box.className = 'quick-note-box';
        box.style.cursor = 'pointer';
        box.addEventListener('click', () => {
            state.activeNoteId = latestNote.id;
            switchTab('notepad');
        });

        // Strip HTML markdown code to show plain text preview
        const bodyPreview = latestNote.body ? latestNote.body.replace(/!\[.*?\]\(.*?\)/g, '[Drawing Image]').substring(0, 150) : 'Empty note contents...';

        box.innerHTML = `
            <div class="quick-note-title">${escapeHTML(latestNote.title || 'Untitled Note')}</div>
            <div class="quick-note-body">${escapeHTML(bodyPreview)}</div>
        `;
        container.appendChild(box);
    }


    // --- Task Manager Controller ---
    const taskModal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const taskSearch = document.getElementById('task-search');
    const taskSort = document.getElementById('task-sort');
    const filterBtns = document.querySelectorAll('.filter-btn');

    let currentFilter = 'all';

    document.getElementById('open-add-task-btn').addEventListener('click', () => {
        openTaskModal();
    });

    document.getElementById('close-task-modal-btn').addEventListener('click', () => {
        closeTaskModal();
    });

    document.getElementById('cancel-task-btn').addEventListener('click', () => {
        closeTaskModal();
    });

    // Toggle alert sound selection container
    const alertToggle = document.getElementById('task-alert-enabled');
    const soundContainer = document.getElementById('task-sound-selection-container');
    alertToggle.addEventListener('change', () => {
        soundContainer.style.display = alertToggle.checked ? 'block' : 'none';
    });

    function openTaskModal(task = null) {
        initAudio(); // Initialize audio context on click
        taskForm.reset();
        
        // Defaults
        document.getElementById('task-form-id').value = '';
        document.getElementById('modal-task-title').textContent = 'Create New Task';
        alertToggle.checked = true;
        soundContainer.style.display = 'block';

        // Prepopulate date and time with current + 1 hour
        const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
        const yyyy = inOneHour.getFullYear();
        const mm = String(inOneHour.getMonth() + 1).padStart(2, '0');
        const dd = String(inOneHour.getDate()).padStart(2, '0');
        document.getElementById('task-deadline-date').value = `${yyyy}-${mm}-${dd}`;
        
        const hrs = String(inOneHour.getHours()).padStart(2, '0');
        const mins = String(inOneHour.getMinutes()).padStart(2, '0');
        document.getElementById('task-deadline-time').value = `${hrs}:${mins}`;

        if (task) {
            document.getElementById('task-form-id').value = task.id;
            document.getElementById('modal-task-title').textContent = 'Edit Task';
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-desc').value = task.desc;
            document.getElementById('task-category').value = task.category;
            document.getElementById('task-priority').value = task.priority;
            
            const dl = new Date(task.deadline);
            const dlY = dl.getFullYear();
            const dlM = String(dl.getMonth() + 1).padStart(2, '0');
            const dlD = String(dl.getDate()).padStart(2, '0');
            document.getElementById('task-deadline-date').value = `${dlY}-${dlM}-${dlD}`;
            
            const dlH = String(dl.getHours()).padStart(2, '0');
            const dlMin = String(dl.getMinutes()).padStart(2, '0');
            document.getElementById('task-deadline-time').value = `${dlH}:${dlMin}`;
            
            alertToggle.checked = task.alertEnabled;
            soundContainer.style.display = task.alertEnabled ? 'block' : 'none';
            document.getElementById('task-sound').value = task.sound;
        }

        taskModal.classList.add('active');
    }

    function closeTaskModal() {
        taskModal.classList.remove('active');
    }

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('task-form-id').value;
        const title = document.getElementById('task-title').value.trim();
        const desc = document.getElementById('task-desc').value.trim();
        const category = document.getElementById('task-category').value;
        const priority = document.getElementById('task-priority').value;
        const dateVal = document.getElementById('task-deadline-date').value;
        const timeVal = document.getElementById('task-deadline-time').value;
        const alertEnabled = alertToggle.checked;
        const sound = document.getElementById('task-sound').value;

        // Parse deadline
        const deadline = new Date(`${dateVal}T${timeVal}`).getTime();

        if (id) {
            // Edit existing
            const idx = state.tasks.findIndex(t => t.id === id);
            if (idx !== -1) {
                // Preserve completed state and trigger flag if deadline is updated
                const wasCompleted = state.tasks[idx].completed;
                const prevDeadline = state.tasks[idx].deadline;
                
                state.tasks[idx] = {
                    ...state.tasks[idx],
                    title,
                    desc,
                    category,
                    priority,
                    deadline,
                    alertEnabled,
                    sound,
                    alertTriggered: deadline === prevDeadline ? state.tasks[idx].alertTriggered : false
                };
            }
        } else {
            // Create new
            const newTask = {
                id: Date.now().toString(),
                title,
                desc,
                category,
                priority,
                deadline,
                alertEnabled,
                sound,
                completed: false,
                alertTriggered: false,
                createdAt: Date.now()
            };
            state.tasks.push(newTask);
        }

        saveTasks();
        closeTaskModal();
        renderTasks();
        
        // Refresh dashboard if we are there
        if (state.activeTab === 'dashboard') {
            renderDashboard();
        }
    });

    // Task list renders, filters, searches
    function renderTasks() {
        const container = document.getElementById('tasks-container');
        container.innerHTML = '';

        const searchVal = taskSearch.value.toLowerCase().trim();
        const sortBy = taskSort.value;

        // Filter
        let filtered = state.tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchVal) || task.desc.toLowerCase().includes(searchVal);
            
            if (!matchesSearch) return false;

            if (currentFilter === 'pending') return !task.completed;
            if (currentFilter === 'completed') return task.completed;
            if (currentFilter === 'high') return task.priority === 'high';
            
            if (currentFilter === 'overdue') {
                return !task.completed && task.deadline < Date.now();
            }

            return true;
        });

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'deadline') {
                return a.deadline - b.deadline;
            }
            if (sortBy === 'priority') {
                const priorityWeight = { high: 3, medium: 2, low: 1 };
                return priorityWeight[b.priority] - priorityWeight[a.priority];
            }
            if (sortBy === 'created') {
                return b.createdAt - a.createdAt;
            }
            if (sortBy === 'title') {
                return a.title.localeCompare(b.title);
            }
            return 0;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="glass-card text-center" style="grid-column: 1 / -1; padding: 50px;">
                    <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 15px;"></i>
                    <h3>No tasks found</h3>
                    <p style="color: var(--text-secondary);">Create a task or change your filter criteria.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(task => {
            const card = document.createElement('div');
            card.className = `glass-card task-card ${task.completed ? 'completed' : ''}`;
            
            // Priority colors
            let priorityColor = 'var(--priority-low)';
            let priorityBadgeClass = 'priority-badge-low';
            if (task.priority === 'medium') {
                priorityColor = 'var(--priority-medium)';
                priorityBadgeClass = 'priority-badge-medium';
            } else if (task.priority === 'high') {
                priorityColor = 'var(--priority-high)';
                priorityBadgeClass = 'priority-badge-high';
            }
            card.style.setProperty('--priority-color', priorityColor);

            // Deadline alerts time calculations
            const dlDate = new Date(task.deadline);
            const dateString = dlDate.toLocaleDateString() + ' ' + dlDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const isOverdue = !task.completed && task.deadline < Date.now();
            let deadlineColor = isOverdue ? 'var(--priority-high)' : 'var(--text-secondary)';
            card.style.setProperty('--deadline-color', deadlineColor);

            card.innerHTML = `
                <div class="task-card-header">
                    <div class="task-card-title-group">
                        <button class="task-checkbox-btn" onclick="toggleTaskCompletion('${task.id}')" title="Mark complete">
                            <i class="fa-solid fa-check"></i>
                        </button>
                        <div>
                            <h3 class="task-title">${escapeHTML(task.title)}</h3>
                            <span class="category-tag mt-2">
                                ${getCategoryEmoji(task.category)} ${task.category}
                            </span>
                        </div>
                    </div>
                    <span class="${priorityBadgeClass}">${task.priority.toUpperCase()}</span>
                </div>
                <p class="task-desc">${escapeHTML(task.desc || 'No description provided.')}</p>
                <div class="task-card-meta">
                    <span class="task-deadline">
                        <i class="fa-solid fa-clock"></i> 
                        ${isOverdue ? 'Overdue: ' : ''}${dateString}
                    </span>
                    ${task.alertEnabled ? `<i class="fa-solid fa-volume-high task-sound-indicator" title="Alarms Enabled (${task.sound})"></i>` : ''}
                    <div class="task-card-actions">
                        <button class="btn-icon btn-icon-only" onclick="editTask('${task.id}')" title="Edit Task">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-icon-only text-danger" onclick="deleteTask('${task.id}')" title="Delete Task">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Expose helpers globally so they work via onclick inline triggers
    window.toggleTaskCompletion = function(id) {
        initAudio();
        const idx = state.tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
            state.tasks[idx].completed = !state.tasks[idx].completed;
            saveTasks();
            renderTasks();
            if (state.activeTab === 'dashboard') renderDashboard();
        }
    };

    window.editTask = function(id) {
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            openTaskModal(task);
        }
    };

    window.deleteTask = function(id) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        if (state.activeTab === 'dashboard') renderDashboard();
    };

    // Filter Buttons click handlers
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    taskSearch.addEventListener('input', renderTasks);
    taskSort.addEventListener('change', renderTasks);


    // --- Alarm Deadlines Monitor Loop ---
    const alarmModal = document.getElementById('alarm-modal');
    const alarmTaskName = document.getElementById('alarm-task-name');
    const alarmTaskDesc = document.getElementById('alarm-task-desc');
    const alarmTaskCategory = document.getElementById('alarm-task-category');
    const alarmTaskPriority = document.getElementById('alarm-task-priority');

    function checkAlarms() {
        const now = Date.now();
        
        state.tasks.forEach(task => {
            if (!task.completed && task.alertEnabled && !task.alertTriggered && task.deadline <= now) {
                // Play alarm
                triggerAlarm(task);
            }
        });

        // If we are currently on the dashboard, update counts and countdowns
        if (state.activeTab === 'dashboard') {
            renderDashboardUpcomingList();
            
            // Check if overdue count changed
            const overdue = state.tasks.filter(t => !t.completed && t.deadline < now).length;
            document.getElementById('dashboard-overdue-count').textContent = overdue;
        }
    }

    function triggerAlarm(task) {
        task.alertTriggered = true;
        saveTasks();
        
        state.activeAlarmTaskId = task.id;

        // Set Details in Modal
        alarmTaskName.textContent = task.title;
        alarmTaskDesc.textContent = task.desc || 'No description details provided.';
        alarmTaskCategory.textContent = `${getCategoryEmoji(task.category)} ${task.category}`;
        
        alarmTaskPriority.className = ''; // reset
        if (task.priority === 'high') {
            alarmTaskPriority.className = 'priority-badge-high';
            alarmTaskPriority.textContent = 'HIGH PRIORITY';
        } else if (task.priority === 'medium') {
            alarmTaskPriority.className = 'priority-badge-medium';
            alarmTaskPriority.textContent = 'MEDIUM PRIORITY';
        } else {
            alarmTaskPriority.className = 'priority-badge-low';
            alarmTaskPriority.textContent = 'LOW PRIORITY';
        }

        // Open Alarm Overlay
        alarmModal.classList.add('active');

        // Play Sound alerts loop
        startLoopingAlarm(task.sound);
    }

    // Dismiss alarm (completes task)
    document.getElementById('alarm-dismiss-btn').addEventListener('click', () => {
        stopLoopingAlarm();
        alarmModal.classList.remove('active');

        if (state.activeAlarmTaskId) {
            const idx = state.tasks.findIndex(t => t.id === state.activeAlarmTaskId);
            if (idx !== -1) {
                state.tasks[idx].completed = true;
                saveTasks();
            }
            state.activeAlarmTaskId = null;
        }

        // Re-render
        if (state.activeTab === 'tasks') renderTasks();
        if (state.activeTab === 'dashboard') renderDashboard();
    });

    // Snooze alarm (delays alert by 5 mins)
    document.getElementById('alarm-snooze-btn').addEventListener('click', () => {
        stopLoopingAlarm();
        alarmModal.classList.remove('active');

        if (state.activeAlarmTaskId) {
            const idx = state.tasks.findIndex(t => t.id === state.activeAlarmTaskId);
            if (idx !== -1) {
                // Postpone deadline by 5 minutes
                state.tasks[idx].deadline = Date.now() + 5 * 60 * 1000;
                state.tasks[idx].alertTriggered = false; // re-enable alert
                saveTasks();
            }
            state.activeAlarmTaskId = null;
        }

        // Re-render
        if (state.activeTab === 'tasks') renderTasks();
        if (state.activeTab === 'dashboard') renderDashboard();
    });

    // Mute sound alarm only
    document.getElementById('alarm-mute-only-btn').addEventListener('click', () => {
        stopLoopingAlarm();
    });

    // Start background checker
    setInterval(checkAlarms, 1000);


    // --- Notepad Controller ---
    const notesListContainer = document.getElementById('notes-list-container');
    const noteEditorContainer = document.getElementById('note-editor-container');
    const activeNoteEditor = document.getElementById('active-note-editor');
    const noNoteSelected = document.getElementById('no-note-selected');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteTextarea = document.getElementById('note-textarea');
    const notePreviewArea = document.getElementById('note-preview-area');
    const autosaveTag = document.getElementById('autosave-tag');
    const noteWordCount = document.getElementById('note-word-count');
    const noteSearchInput = document.getElementById('note-search');

    let autosaveDebounceTimer = null;
    let editMode = 'edit'; // 'edit' or 'preview'

    document.getElementById('add-note-btn').addEventListener('click', () => {
        createNewNote();
    });

    document.getElementById('create-first-note-btn').addEventListener('click', () => {
        createNewNote();
    });

    document.getElementById('delete-note-btn').addEventListener('click', () => {
        if (state.activeNoteId) {
            deleteNote(state.activeNoteId);
        }
    });

    function createNewNote() {
        const newNote = {
            id: Date.now().toString(),
            title: '',
            body: '',
            updatedAt: Date.now()
        };
        state.notes.push(newNote);
        saveNotes();
        state.activeNoteId = newNote.id;
        
        renderNotesList();
        renderActiveNote();
        
        // Focus the title
        noteTitleInput.focus();
    }

    function deleteNote(id) {
        state.notes = state.notes.filter(n => n.id !== id);
        saveNotes();
        state.activeNoteId = null;
        renderNotesList();
        renderActiveNote();
    }

    function renderNotesList() {
        notesListContainer.innerHTML = '';
        const searchVal = noteSearchInput.value.toLowerCase().trim();

        const filteredNotes = state.notes
            .filter(n => (n.title || 'Untitled Note').toLowerCase().includes(searchVal) || n.body.toLowerCase().includes(searchVal))
            .sort((a, b) => b.updatedAt - a.updatedAt);

        if (filteredNotes.length === 0) {
            notesListContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                    No notes found
                </div>
            `;
            return;
        }

        filteredNotes.forEach(note => {
            const item = document.createElement('div');
            item.className = `note-item ${note.id === state.activeNoteId ? 'active' : ''}`;
            
            const title = note.title.trim() || 'Untitled Note';
            const cleanBody = note.body.replace(/!\[.*?\]\(.*?\)/g, '[Drawing Image]'); // clean drawings tags
            const preview = cleanBody.trim() ? cleanBody.substring(0, 40) : 'Empty note...';
            
            const dateStr = new Date(note.updatedAt).toLocaleDateString() + ' ' + new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            item.innerHTML = `
                <div class="note-item-title">${escapeHTML(title)}</div>
                <div class="note-item-preview">${escapeHTML(preview)}</div>
                <span class="note-item-time">${dateStr}</span>
            `;

            item.addEventListener('click', () => {
                state.activeNoteId = note.id;
                renderNotesList();
                renderActiveNote();
            });

            notesListContainer.appendChild(item);
        });
    }

    function renderActiveNote() {
        if (!state.activeNoteId) {
            activeNoteEditor.classList.add('hidden');
            noNoteSelected.classList.remove('hidden');
            return;
        }

        const note = state.notes.find(n => n.id === state.activeNoteId);
        if (!note) {
            state.activeNoteId = null;
            activeNoteEditor.classList.add('hidden');
            noNoteSelected.classList.remove('hidden');
            return;
        }

        noNoteSelected.classList.add('hidden');
        activeNoteEditor.classList.remove('hidden');

        noteTitleInput.value = note.title;
        noteTextarea.value = note.body;

        updateWordCount(note.body);
        updatePreviewArea(note.body);
        
        // Match toggles styling
        if (editMode === 'edit') {
            noteTextarea.classList.remove('hidden');
            notePreviewArea.classList.add('hidden');
            document.getElementById('note-mode-edit').classList.add('active');
            document.getElementById('note-mode-preview').classList.remove('active');
        } else {
            noteTextarea.classList.add('hidden');
            notePreviewArea.classList.remove('hidden');
            document.getElementById('note-mode-edit').classList.remove('active');
            document.getElementById('note-mode-preview').classList.add('active');
        }
    }

    // Autosave functionality on input typing
    function triggerAutosave() {
        autosaveTag.classList.remove('visible');
        
        if (autosaveDebounceTimer) {
            clearTimeout(autosaveDebounceTimer);
        }

        autosaveDebounceTimer = setTimeout(() => {
            if (!state.activeNoteId) return;

            const noteIdx = state.notes.findIndex(n => n.id === state.activeNoteId);
            if (noteIdx !== -1) {
                state.notes[noteIdx].title = noteTitleInput.value.trim();
                state.notes[noteIdx].body = noteTextarea.value;
                state.notes[noteIdx].updatedAt = Date.now();

                saveNotes();
                
                // Show saved status briefly
                autosaveTag.classList.add('visible');
                setTimeout(() => {
                    autosaveTag.classList.remove('visible');
                }, 1500);

                // Update list element preview
                renderNotesList();
            }
        }, 500);
    }

    noteTitleInput.addEventListener('input', triggerAutosave);
    noteTextarea.addEventListener('input', () => {
        triggerAutosave();
        updateWordCount(noteTextarea.value);
    });

    noteSearchInput.addEventListener('input', renderNotesList);

    function updateWordCount(text) {
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        noteWordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
    }

    // Basic markdown conversion preview
    function updatePreviewArea(rawText) {
        if (!rawText.trim()) {
            notePreviewArea.innerHTML = `<p style="color: var(--text-muted); font-style: italic;">Nothing to preview...</p>`;
            return;
        }

        let html = escapeHTML(rawText);

        // Bold code: **text**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic: *text*
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Newline tags
        html = html.replace(/\n/g, '<br>');

        // Drawing tags: ![sketch](dataurl...)
        // Wait, because we escaped HTML, the dataurl starts with `&lt;` or normal URL. Let's make sure drawings are rendered.
        // The markdown for drawing in textarea is: ![Drawing: date](data:image/png;base64,...)
        // Let's parse it manually since we escaped. The raw text had `![Title](data:...)`
        // After escaping: `![Title](data:...)` -> no escape for standard parenthesis in custom function but base64 can have tags.
        // Let's replace the escaped markdown image pattern: `!\[(.*?)\]\((.*?)\)`
        const imgRegex = /!\[(.*?)\]\((data:image\/png;base64,.*?)\)/g;
        html = html.replace(imgRegex, (match, title, dataUrl) => {
            return `<div class="preview-img-wrapper"><img src="${dataUrl}" alt="${title}"><br><small style="color: var(--text-secondary); text-align: center; display:block;">${title}</small></div>`;
        });

        notePreviewArea.innerHTML = html;
    }

    // Toggle Notepad Mode
    document.getElementById('note-mode-edit').addEventListener('click', () => {
        editMode = 'edit';
        renderActiveNote();
    });
    document.getElementById('note-mode-preview').addEventListener('click', () => {
        editMode = 'preview';
        updatePreviewArea(noteTextarea.value);
        renderActiveNote();
    });


    // --- Drawing Board Controller ---
    const canvas = document.getElementById('sketchpad');
    const ctx = canvas.getContext('2d');
    const toolBtns = document.querySelectorAll('.tool-btn');
    const swatchBtns = document.querySelectorAll('.swatch-btn');
    const strokeWidthSelect = document.getElementById('draw-stroke-width');
    const colorPicker = document.getElementById('draw-color-picker');

    let currentTool = 'pen';
    let strokeColor = '#ffffff';
    let strokeWidth = 5;
    
    let drawing = false;
    let startX = 0;
    let startY = 0;
    let canvasSnapshot = null; // for shape previews

    let drawUndoStack = [];
    let drawRedoStack = [];
    const MAX_HISTORY = 20;

    // Fixed Internal drawing bounds coordinates
    canvas.width = 1000;
    canvas.height = 600;

    function resizeCanvas() {
        // Set canvas CSS scale size wrapper constraints to match layout.
        // Drawing coordinates stay 1000x600 inside.
        // Set canvas styling rules: line caps, joins
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    // Push state helper for Undo/Redo
    function pushHistory() {
        if (drawUndoStack.length >= MAX_HISTORY) {
            drawUndoStack.shift();
        }
        drawUndoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        // Clear redo stack on new action
        drawRedoStack = [];
    }

    // Setup events for canvas
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch events for mobile compatibility
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            // Scale touch coordinates to canvas internal coordinates (1000x600)
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            // Override positions manually
            startX = (touch.clientX - rect.left) * scaleX;
            startY = (touch.clientY - rect.top) * scaleY;
            startDrawing(mouseEvent, true);
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault(); // Prevent scrolling page
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (touch.clientX - rect.left) * scaleX;
            const y = (touch.clientY - rect.top) * scaleY;
            
            drawTouch(x, y);
        }
    });

    canvas.addEventListener('touchend', () => {
        stopDrawing();
    });

    function startDrawing(e, isTouch = false) {
        initAudio();
        drawing = true;
        pushHistory();

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if (!isTouch) {
            startX = (e.clientX - rect.left) * scaleX;
            startY = (e.clientY - rect.top) * scaleY;
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);

        // Capture snapshot for geometric shapes preview drawing
        canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    function draw(e) {
        if (!drawing) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;

        drawProcess(currentX, currentY);
    }

    function drawTouch(currentX, currentY) {
        if (!drawing) return;
        drawProcess(currentX, currentY);
    }

    function drawProcess(currentX, currentY) {
        // Apply tool specific configurations
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = currentTool === 'eraser' ? '#000000' : strokeColor;
        
        // Eraser handles transparent / background wipe
        if (currentTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        if (currentTool === 'pen' || currentTool === 'eraser') {
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        } else {
            // Restore snapshot to clear previous frame previews of geometric shapes
            ctx.putImageData(canvasSnapshot, 0, 0);
            ctx.beginPath();
            ctx.globalCompositeOperation = 'source-over'; // Shapes override eraser context
            ctx.strokeStyle = strokeColor;
            
            if (currentTool === 'line') {
                ctx.moveTo(startX, startY);
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
            } else if (currentTool === 'rect') {
                const w = currentX - startX;
                const h = currentY - startY;
                ctx.strokeRect(startX, startY, w, h);
            } else if (currentTool === 'circle') {
                const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
                ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
                ctx.stroke();
            }
        }
    }

    function stopDrawing() {
        if (!drawing) return;
        drawing = false;
        ctx.beginPath();
        // Reset composite mode
        ctx.globalCompositeOperation = 'source-over';
    }

    // Toggle Tool buttons active class
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
        });
    });

    // Swatches selection
    swatchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            swatchBtns.forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            strokeColor = btn.dataset.color;
            
            // Sync with picker visual state
            colorPicker.value = strokeColor === '#ffffff' ? '#ffffff' : strokeColor;
        });
    });

    colorPicker.addEventListener('input', (e) => {
        strokeColor = e.target.value;
        // Uncheck swatches active state
        swatchBtns.forEach(s => s.classList.remove('active'));
    });

    strokeWidthSelect.addEventListener('change', (e) => {
        strokeWidth = parseInt(e.target.value);
    });

    // Drawing Actions: Undo, Redo, Clear, Download
    document.getElementById('draw-undo').addEventListener('click', () => {
        if (drawUndoStack.length > 0) {
            drawRedoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            const lastState = drawUndoStack.pop();
            ctx.putImageData(lastState, 0, 0);
        }
    });

    document.getElementById('draw-redo').addEventListener('click', () => {
        if (drawRedoStack.length > 0) {
            drawUndoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            const nextState = drawRedoStack.pop();
            ctx.putImageData(nextState, 0, 0);
        }
    });

    document.getElementById('draw-clear').addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the canvas?")) {
            pushHistory();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    });

    document.getElementById('draw-download').addEventListener('click', () => {
        // Save transparent canvas to PNG. We overlay black background on downloaded image for visibility if they want
        // or just download directly as transparent. Transparent is standard.
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.download = `sketch-${Date.now()}.png`;
        link.href = image;
        link.click();
    });

    // Save to Notepad Drawings Gallery
    document.getElementById('draw-save-gallery').addEventListener('click', () => {
        // Prompt for drawing title
        const title = prompt("Enter a title for this drawing:", `Sketch ${state.drawings.length + 1}`);
        if (title === null) return; // cancelled

        const dataUrl = canvas.toDataURL("image/png");
        const newDrawing = {
            id: Date.now().toString(),
            title: title.trim() || `Sketch ${state.drawings.length + 1}`,
            dataUrl: dataUrl,
            createdAt: Date.now()
        };

        state.drawings.push(newDrawing);
        saveDrawings();
        alert("Sketch saved successfully to gallery! You can now insert it into any Notepad note.");

        // Refresh stats if on dashboard
        renderDashboard();
    });


    // --- Insert Drawing Modal Gallery Controller ---
    const galleryModal = document.getElementById('gallery-modal');
    const galleryGrid = document.getElementById('gallery-grid-container');
    const galleryEmpty = document.getElementById('gallery-empty');

    document.getElementById('insert-drawing-btn').addEventListener('click', () => {
        openGalleryModal();
    });

    document.getElementById('close-gallery-modal-btn').addEventListener('click', () => {
        galleryModal.classList.remove('active');
    });

    function openGalleryModal() {
        galleryGrid.innerHTML = '';
        
        if (state.drawings.length === 0) {
            galleryEmpty.classList.remove('hidden');
        } else {
            galleryEmpty.classList.add('hidden');
            
            state.drawings.forEach(draw => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.innerHTML = `
                    <img src="${draw.dataUrl}" alt="${escapeHTML(draw.title)}">
                    <div class="gallery-item-title">${escapeHTML(draw.title)}</div>
                `;

                item.addEventListener('click', () => {
                    insertDrawingToNote(draw);
                });

                galleryGrid.appendChild(item);
            });
        }

        galleryModal.classList.add('active');
    }

    function insertDrawingToNote(drawing) {
        galleryModal.classList.remove('active');
        
        // Insert markdown tag in Notepad text area
        const cursorPosition = noteTextarea.selectionStart;
        const text = noteTextarea.value;
        const markdownTag = `\n![${drawing.title}](${drawing.dataUrl})\n`;

        noteTextarea.value = text.slice(0, cursorPosition) + markdownTag + text.slice(cursorPosition);
        
        // Trigger save and render preview
        triggerAutosave();
        updateWordCount(noteTextarea.value);
        updatePreviewArea(noteTextarea.value);

        // Switch to preview mode to show visual sketch immediately
        editMode = 'preview';
        renderActiveNote();
    }


    // --- Settings Controller ---
    const settingsDefaultSound = document.getElementById('settings-default-sound');
    const settingsVolume = document.getElementById('settings-volume');
    const settingsDuration = document.getElementById('settings-alert-duration');

    settingsDefaultSound.addEventListener('change', (e) => {
        state.settings.defaultSound = e.target.value;
        saveSettings();
    });

    settingsVolume.addEventListener('input', (e) => {
        state.settings.volume = parseFloat(e.target.value);
        saveSettings();
    });

    // Play sound test
    document.getElementById('test-sound-btn').addEventListener('click', () => {
        playAlertSound(state.settings.defaultSound);
    });

    settingsDuration.addEventListener('change', (e) => {
        state.settings.alertDuration = parseInt(e.target.value);
        saveSettings();
    });

    // Theme Selector elements
    document.querySelectorAll('.theme-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            const theme = swatch.dataset.theme;
            state.settings.theme = theme;
            saveSettings();
            initTheme();
        });
    });

    // Reset Database option
    document.getElementById('clear-all-data-btn').addEventListener('click', () => {
        if (confirm("WARNING: This will permanently delete all tasks, notes, and saved drawings. Are you sure?")) {
            localStorage.clear();
            state.tasks = [];
            state.notes = [];
            state.drawings = [];
            state.settings = {
                defaultSound: 'chime',
                volume: 0.7,
                alertDuration: 30,
                theme: 'default'
            };
            
            saveSettings();
            saveTasks();
            saveNotes();
            saveDrawings();

            initTheme();
            initSettingsFields();
            switchTab('dashboard');
            alert("All stored local databases formatted successfully.");
        }
    });


    // --- General Utility Helpers ---
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getCategoryEmoji(category) {
        const emojis = {
            Work: '💼',
            Personal: '🏠',
            Health: '💪',
            Studies: '📚',
            Other: '✨'
        };
        return emojis[category] || '✨';
    }


    // --- Core Initializer Invocation ---
    initTheme();
    initSettingsFields();
    checkAutoplayPermission();
    renderDashboard();
});
