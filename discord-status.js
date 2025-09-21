let retryCount = 0;
let retryTimer = null;

async function fetchDiscordStatus() {
    const DISCORD_USER_ID = '1258094804487897252';
    const LANYARD_API_URL = `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`;

    try {
        console.log('Fetching Discord status from API...');
        const response = await fetch(LANYARD_API_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Discord API response:', JSON.stringify(data, null, 2));

        if (data.success) {
            retryCount = 0;
            updateDiscordStatus(data.data);
            console.log('Discord status updated successfully');
        } else {
            throw new Error(`API returned unsuccessful response: ${JSON.stringify(data)}`);
        }
    } catch (error) {
        console.error('Error fetching Discord status:', error);
        console.log('API URL attempted:', LANYARD_API_URL);
        console.log('Current retry count:', retryCount);
        
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
    }
}

function updateDiscordStatus(userData) {
    console.log('Updating Discord status with data:', JSON.stringify(userData, null, 2));
    
    const discordContainer = document.getElementById('discordStatus');
    if (!discordContainer) {
        throw new Error('Discord status container not found');
    }

    if (!userData || !userData.discord_user) {
        throw new Error('Invalid user data received from API');
    }

    const user = userData.discord_user;
    const status = userData.discord_status || 'offline';
    const activities = userData.activities || [];

    // Create Discord avatar URL with error handling
    let avatarUrl;
    try {
        if (user.avatar) {
            const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
            avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=256`;
            console.log('Generated avatar URL:', avatarUrl);
        } else {
            const defaultIndex = parseInt(user.discriminator || '0') % 5;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
            console.log('Using default avatar:', avatarUrl);
        }
    } catch (error) {
        console.error('Error creating avatar URL:', error);
        avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
    }

    // Update main avatar with error handling
    const mainAvatarImg = document.getElementById('mainAvatarImg');
    const mainStatusIndicator = document.getElementById('mainStatusIndicator');
    const mainFrame = document.getElementById('mainFrame');

    if (mainAvatarImg) {
        mainAvatarImg.src = avatarUrl;
        mainAvatarImg.alt = user.global_name || user.username;
        mainAvatarImg.style.display = 'block';
        
        mainAvatarImg.onerror = function() {
            this.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
        };
    }

    if (mainStatusIndicator) {
        mainStatusIndicator.className = `status-indicator status-${status}`;
        mainStatusIndicator.style.display = 'block';
    }

    if (user.avatar_decoration_data && mainFrame) {
        const decorationUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=160`;
        mainFrame.src = decorationUrl;
        mainFrame.style.display = 'block';
        
        mainFrame.onerror = function() {
            this.style.display = 'none';
        };
    } else if (mainFrame) {
        mainFrame.style.display = 'none';
    }

    let statusHTML = `
        <div class="discord-header" style="padding: 10px; background: rgba(88, 101, 242, 0.05); border-radius: 8px; margin-bottom: 10px;">
            <div style="text-align: center;">
                <div style="font-size: 1.1em; font-weight: bold; color: #5865F2; margin-bottom: 5px;">
                    <i class="fab fa-discord"></i> Discord Status
                </div>
                <div style="font-size: 0.9em; color: #666;">
                    Status: <span style="color: ${getStatusColor(status)}; font-weight: bold;">${getStatusText(status)}</span>
                </div>
            </div>
        </div>
    `;

    // Add activities section
    statusHTML += '<div style="margin-top: 15px;">';
    
    if (activities.length > 0) {
        statusHTML += '<div style="font-size: 1.1em; font-weight: bold; margin-bottom: 10px; color: #5865F2;">🎮 Hoạt động hiện tại</div>';
        activities.forEach((activity) => {
            if (activity.type === 4) {
                // Custom Status
                statusHTML += `
                    <div class="discord-activity" style="display: flex; align-items: center; padding: 12px; margin: 8px 0; background: rgba(88, 101, 242, 0.1); border-radius: 8px;">
                        ${activity.emoji ? 
                            `<img src="https://cdn.discordapp.com/emojis/${activity.emoji.id}.${activity.emoji.animated ? 'gif' : 'png'}?size=24" style="width: 24px; height: 24px; margin-right: 8px;" alt="${activity.emoji.name}" onerror="this.style.display='none'">` 
                            : ''}
                        <div>
                            <div style="font-size: 0.9em; color: #666;">hoạt động</div>
                            <div style="font-weight: 500;">${activity.state || 'không có hoạt động nào'}</div>
                        </div>
                    </div>
                `;
            } else if (activity.type === 0) {
                // Playing Game
                let gameImageUrl = '';
                if (activity.assets?.large_image) {
                    if (activity.assets.large_image.startsWith('mp:external/')) {
                        // Handle Roblox images
                        const urlParts = activity.assets.large_image.split('/https/');
                        if (urlParts.length >= 2) {
                            gameImageUrl = `https://${urlParts[1]}`;
                        }
                    } else {
                        gameImageUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`;
                    }
                }

                statusHTML += `
                    <div class="discord-activity" style="display: flex; align-items: center; padding: 12px; margin: 8px 0; background: rgba(88, 101, 242, 0.1); border-radius: 8px;">
                        ${gameImageUrl ? 
                            `<img src="${gameImageUrl}" 
                                style="width: 60px; height: 60px; border-radius: 8px; margin-right: 12px; object-fit: cover;" 
                                alt="${activity.assets?.large_text || activity.name}"
                                onerror="this.onerror=null; this.src='https://images.rbxcdn.com/23421755af1e24d57ea49261189d805d.png';">` 
                            : '<div style="width: 60px; height: 60px; border-radius: 8px; margin-right: 12px; background: rgba(88, 101, 242, 0.2); display: flex; align-items: center; justify-content: center;"><i class="fas fa-gamepad" style="font-size: 24px; color: #5865F2;"></i></div>'}
                        <div>
                            <div style="font-size: 0.9em; color: #666;">Playing</div>
                            <div style="font-weight: 500;">${activity.name}</div>
                            ${activity.details ? `<div style="font-size: 0.9em;">${activity.details}</div>` : ''}
                            ${activity.state ? `<div style="font-size: 0.9em; color: #666;">${activity.state}</div>` : ''}
                            ${activity.timestamps?.start ? 
                                `<div style="font-size: 0.8em; color: #666; margin-top: 4px;">
                                    ${formatElapsedTime(activity.timestamps.start)}
                                </div>` 
                                : ''}
                        </div>
                    </div>
                `;
            } else if (activity.type === 2) {
                // Listening to Spotify
                statusHTML += `
                    <div class="discord-activity" style="display: flex; align-items: center; padding: 12px; margin: 8px 0; background: rgba(30, 215, 96, 0.1); border-radius: 8px;">
                        <i class="fab fa-spotify" style="font-size: 24px; color: #1DB954; margin-right: 12px;"></i>
                        <div>
                            <div style="font-size: 0.9em; color: #666;">Listening to Spotify</div>
                            <div style="font-weight: 500;">${activity.details || ''}</div>
                            ${activity.state ? `<div style="font-size: 0.9em;">by ${activity.state}</div>` : ''}
                        </div>
                    </div>
                `;
            }
        });
    } else {
        statusHTML += `
            <div style="text-align: center; padding: 20px; color: #666; font-style: italic;">
                <i class="fas fa-moon" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                Hiện tại chưa có hoạt động nào
            </div>
        `;
    }
    
    statusHTML += '</div>'; // Close activities section

    discordContainer.innerHTML = statusHTML;
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
    const now = Date.now();
    const elapsed = Math.floor((now - startTimestamp) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);

    if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
}

function showDiscordError(message) {
    const discordContainer = document.getElementById('discordStatus');
    if (discordContainer) {
        discordContainer.innerHTML = `
            <div class="loading-status error-status" style="color: #f23f43; padding: 15px; background: rgba(242, 63, 67, 0.1); border-radius: 8px; margin: 10px 0;">
                <i class="fab fa-discord"></i> ${message}
                <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    ID: ${DISCORD_USER_ID}
                </div>
                <div style="margin-top: 15px;">
                    <button onclick="retryDiscordStatus()" class="retry-btn" style="
                        background: #5865F2;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: background 0.3s;
                    ">Thử lại ngay</button>
                </div>
            </div>
        `;
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
