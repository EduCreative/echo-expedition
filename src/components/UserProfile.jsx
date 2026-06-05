/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useRef, useMemo } from 'react';
import useStore from '../lib/store';
import { goToDashboard, updateUserProfile } from '../lib/actions';
import c from 'clsx';

const XP_PER_LEVEL = 500;

function ProfileStatsGrid() {
    const { 
        user, 
        progress, 
        pronunciationRaceHighScore, 
        listeningDrillHighScore 
    } = useStore();

    const { totalLessonsCompleted, totalXpEarned } = useMemo(() => {
        if (!user) return { totalLessonsCompleted: 0, totalXpEarned: 0 };
        
        const lessonsCompleted = Object.values(progress).reduce(
          (acc, levelProgress) => acc + Object.keys(levelProgress).length,
          0
        );
    
        const xpFromLevels = ((user.level || 1) - 1) * XP_PER_LEVEL;
        const totalXp = xpFromLevels + (user.xp || 0);
    
        return { totalLessonsCompleted: lessonsCompleted, totalXpEarned: totalXp };
      }, [progress, user]);

    return (
        <div className="profile-stats-grid">
            <div className="stat-item">
                <span className="icon stat-icon">star</span>
                <span className="stat-value">{totalXpEarned.toLocaleString()}</span>
                <span className="stat-label">Total XP Earned</span>
            </div>
             <div className="stat-item">
                <span className="icon stat-icon">library_books</span>
                <span className="stat-value">{totalLessonsCompleted}</span>
                <span className="stat-label">Lessons Completed</span>
            </div>
            <div className="stat-item">
                <span className="icon stat-icon">timer</span>
                <span className="stat-value">{pronunciationRaceHighScore}</span>
                <span className="stat-label">Race High Score</span>
            </div>
            <div className="stat-item">
                <span className="icon stat-icon">hearing</span>
                <span className="stat-value">{listeningDrillHighScore}</span>
                <span className="stat-label">Drill High Score</span>
            </div>
        </div>
    );
}


export default function UserProfile() {
    const { user, isProcessing } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(user?.photoURL || null);
    const fileInputRef = useRef(null);

    const currentLevel = user.level || 1;
    const currentXp = user.xp || 0;
    const xpForNextLevel = currentLevel * XP_PER_LEVEL;
    const xpPercentage = (currentXp / xpForNextLevel) * 100;

    const handleAvatarClick = () => {
        if (isEditing) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        const updates = {};
        if (displayName !== user.displayName) {
            updates.displayName = displayName;
        }
        if (photoFile) {
            updates.photoFile = photoFile;
        }

        if (Object.keys(updates).length > 0) {
            await updateUserProfile(updates);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setDisplayName(user.displayName);
        setPhotoFile(null);
        setPhotoPreview(user.photoURL);
        setIsEditing(false);
    };

    return (
        <div className="profile-view">
            <button className="button back-to-dashboard" onClick={goToDashboard}>
                <span className="icon">arrow_back</span> Back to Dashboard
            </button>
            <div className="profile-card">
                <div className="profile-avatar-section">
                    <div className={c("avatar-large-wrapper", { 'editable': isEditing })} onClick={handleAvatarClick}>
                        {photoPreview ? (
                            <img src={photoPreview} alt="User avatar" className="avatar-large" />
                        ) : (
                            <div className="avatar-large placeholder">
                                <span className="icon">person</span>
                            </div>
                        )}
                        {isEditing && (
                            <div className="avatar-upload-trigger">
                                <span className="icon">edit</span>
                            </div>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg"
                        style={{ display: 'none' }}
                    />
                </div>

                <div className="profile-details">
                    {isEditing ? (
                        <div className="profile-form">
                            <input 
                                type="text" 
                                value={displayName} 
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your Name"
                                aria-label="Display Name"
                            />
                        </div>
                    ) : (
                        <h2>{user.displayName || 'Explorer'}</h2>
                    )}
                    
                    <p className="profile-email">{user.email}</p>

                    <div className="profile-level-xp">
                        <div className="level-badge">LVL {currentLevel}</div>
                        <div className="xp-details">
                            <div className="xp-bar">
                                <div className="xp-bar-inner" style={{ width: `${xpPercentage}%` }}></div>
                            </div>
                            <div className="xp-text">{currentXp} / {xpForNextLevel} XP</div>
                        </div>
                    </div>

                    <div className="profile-actions">
                        {isEditing ? (
                            <>
                                <button className="button" onClick={handleCancel}>Cancel</button>
                                <button className="button primary" onClick={handleSave} disabled={isProcessing}>
                                    {isProcessing ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            <button className="button" onClick={() => setIsEditing(true)}>
                                <span className="icon">edit</span> Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <ProfileStatsGrid />

        </div>
    );
}