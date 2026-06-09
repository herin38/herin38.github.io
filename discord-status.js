window.discordProfileLoaded = false;
let retryCount = 0;
let retryTimer = null;
const DISCORD_USER_ID = '1258094804487897252';

async function fetchDiscordStatus() {
    try {
        console.log('Fetching Discord status from API...');
        const cb = Date.now();
        const url = `https://api.notjdevelopment.baby/v1/users/${DISCORD_USER_ID}?_cb=${cb}`;
        
        const response = await fetch(url, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let userData = null;
        
        if (data && data.success && data.data) {
            userData = data.data;
        } else if (data && data.data && data.data.discord_user) {
            userData = data.data;
        } else {
            throw new Error("API response did not contain expected data structure");
        }

        retryCount = 0;
        updateDiscordStatus(userData);
        console.log('Discord status updated successfully');
    } catch (error) {
        console.error('Error fetching Discord status:', error);
        
        if (retryTimer) {
            clearTimeout(retryTimer);
        }

        retryCount++;
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000);

        if (retryCount <= 5) {
            const errorMessage = error.message || 'Unknown error';
            showDiscordError(`Lỗi kết nối (${errorMessage}) - Đang thử lại sau ${Math.round(retryDelay/1000)} giây...`);
            console.log(`Retrying in ${retryDelay}ms...`);
            retryTimer = setTimeout(fetchDiscordStatus, retryDelay);
        } else {
            showDiscordError(`Không thể kết nối tới Discord (${error.message || 'Unknown error'}). Vui lòng tải lại trang.`);
            console.error('Max retry attempts reached. Giving up.');
        }
    } finally {
        if (!window.discordProfileLoaded) {
            window.discordProfileLoaded = true;
            if (typeof window.onDiscordProfileLoaded === 'function') {
                window.onDiscordProfileLoaded();
            }
        }
    }
}

function getAssetImageUrl(applicationId, asset) {
    if (!asset) return '';
    if (asset.startsWith('mp:external/')) {
        const parts = asset.split('/https/');
        if (parts.length >= 2) {
            return 'https://' + parts[1];
        }
        const httpParts = asset.split('/http/');
        if (httpParts.length >= 2) {
            return 'http://' + httpParts[1];
        }
    }
    if (applicationId) {
        return `https://cdn.discordapp.com/app-assets/${applicationId}/${asset}.png`;
    }
    return '';
}

function parseBioLinks(text) {
    if (!text) return '';
    // Escape HTML to prevent XSS
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    // URL pattern matching
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return escaped.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #5865F2; text-decoration: underline;">${url}</a>`;
    });
}

function updateDiscordStatus(userData) {
    console.log('Updating Discord status with data:', JSON.stringify(userData, null, 2));
    
    if (!userData || !userData.discord_user) {
        throw new Error('Invalid user data received from API');
    }

    const user = userData.discord_user;
    const status = userData.discord_status || 'offline';
    const activities = userData.activities || [];
    const profile = userData.user_profile || {};
    const connections = userData.connected_accounts || [];
    const badges = userData.badges || [];

    // 1. Update avatar
    let avatarUrl = user.avatar_url;
    if (!avatarUrl) {
        if (user.avatar) {
            const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
            avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=256`;
        } else {
            const defaultIndex = parseInt(user.discriminator || '0') % 5;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
        }
    }
    
    const mainAvatarImg = document.getElementById('mainAvatarImg');
    if (mainAvatarImg) {
        mainAvatarImg.src = avatarUrl;
        mainAvatarImg.alt = user.global_name || user.username;
        mainAvatarImg.style.display = 'block';
        mainAvatarImg.onerror = function() {
            this.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
        };
    }

    // 2. Update status dot
    const mainStatusIndicator = document.getElementById('mainStatusIndicator');
    if (mainStatusIndicator) {
        mainStatusIndicator.className = `status-dot avatar-status status-${status}`;
        mainStatusIndicator.title = getStatusText(status);
        mainStatusIndicator.style.display = 'inline-block';
    }

    // 3. Update avatar decoration frame
    const mainFrame = document.getElementById('mainFrame');
    let decorationUrl = user.avatar_decoration_data?.avatar_decoration_url;
    if (!decorationUrl && user.avatar_decoration_data) {
        decorationUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=160`;
    }

    if (decorationUrl && mainFrame) {
        mainFrame.src = decorationUrl;
        mainFrame.style.display = 'block';
        mainFrame.onerror = function() {
            this.style.display = 'none';
        };
    } else if (mainFrame) {
        mainFrame.style.display = 'none';
    }

    const discordAvatarWrap = document.querySelector('.discord-avatar-wrap');
    if (discordAvatarWrap) {
        if (decorationUrl) {
            discordAvatarWrap.className = `discord-avatar-wrap status-${status} has-decoration`;
        } else {
            discordAvatarWrap.className = `discord-avatar-wrap status-${status}`;
        }
    }

    // 4. Update Banner
    const discordBanner = document.getElementById('discordBanner');
    if (discordBanner) {
        if (user.banner_url) {
            discordBanner.style.backgroundImage = `url('${user.banner_url}')`;
            discordBanner.style.backgroundColor = 'transparent';
        } else {
            discordBanner.style.backgroundImage = 'none';
            const colorHex = user.banner_color || (user.accent_color ? '#' + user.accent_color.toString(16).padStart(6, '0') : 'rgba(255, 255, 255, 0.1)');
            discordBanner.style.backgroundColor = colorHex;
        }
    }

    // 5. Update names
    const discordDisplayName = document.getElementById('discordDisplayName');
    if (discordDisplayName) {
        discordDisplayName.textContent = user.global_name || user.display_name || user.username;
    }

    const discordUsername = document.getElementById('discordUsername');
    if (discordUsername) {
        discordUsername.textContent = `@${user.username}`;
    }



    // 9. Update Badges
    const discordBadges = document.getElementById('discordBadges');
    if (discordBadges) {
        if (badges.length > 0) {
            discordBadges.style.display = 'flex';
            discordBadges.innerHTML = badges.map(b => 
                `<img class="profile-badge" src="${b.icon_url}" alt="${b.description}" title="${b.description}" />`
            ).join('');
        } else {
            discordBadges.style.display = 'none';
        }
    }


}

function getStatusText(status) {
    switch (status) {
        case 'online':
            return 'Đang online';
        case 'idle':
            return 'Đang rảnh';
        case 'dnd':
            return 'Đừng làm phiền';
        case 'offline':
            return 'Offline';
        default:
            return 'Không xác định';
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'online':
            return '#23a55a';
        case 'idle':
            return '#f0b232';
        case 'dnd':
            return '#f23f43';
        case 'offline':
            return '#80848e';
        default:
            return '#666';
    }
}

function formatElapsedTime(startTimestamp) {
    if (!startTimestamp) return '';
    const startMs = typeof startTimestamp === 'number' ? startTimestamp : new Date(startTimestamp).getTime();
    if (isNaN(startMs)) return '';
    
    const now = Date.now();
    const elapsed = Math.floor((now - startMs) / 1000);
    if (elapsed < 0) return '00:00 elapsed';
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    const pad = (num) => num.toString().padStart(2, '0');
    
    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)} elapsed`;
    } else {
        return `${pad(minutes)}:${pad(seconds)} elapsed`;
    }
}

function showDiscordError(message) {
    const discordStatusText = document.getElementById('discordStatusText');
    if (discordStatusText) {
        discordStatusText.textContent = `Lỗi: ${message}`;
    }
}

function retryDiscordStatus() {
    console.log('Manual retry initiated');
    retryCount = 0;
    showDiscordError('Đang kết nối lại...');
    setTimeout(fetchDiscordStatus, 1000);
}

// Initialize Discord status fetching
document.addEventListener('DOMContentLoaded', () => {
    fetchDiscordStatus();
    // Refresh status every 30 seconds
    setInterval(fetchDiscordStatus, 30000);
});
