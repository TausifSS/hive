import React, { useState, useRef } from 'react';
// Naye design ke liye icons
import { Plus, Video, Radio, X, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';

const CreatePost = () => {
    // Ab state batayega ki kaunsa modal khula hai: 'post', 'live', ya null
    const [modalType, setModalType] = useState<'post' | 'live' | null>(null);
    const [postText, setPostText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Event handlers ko a_chhe se handle karne ke liye
    const handleActionClick = (e: React.MouseEvent, type: 'post' | 'live') => {
        e.stopPropagation(); // Taaki card ka onClick na chale
        setModalType(type);
    };

    const handlePost = () => {
        console.log("New Post:", { text: postText, file: selectedFile });
        closeModal();
    };
    
    const handleGoLive = () => {
        console.log("Starting Live Video...");
        closeModal();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const closeModal = () => {
        setModalType(null);
        setPostText('');
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    return (
        <>
            {/* --- TRIGGER CARD --- */}
            <div style={styles.card} onClick={() => setModalType('post')}>
                <div style={styles.topRow}>
                    <div style={styles.profileIcon}></div>
                    <div style={styles.inputMock}>
                        <span>What's on your mind?</span>
                    </div>
                </div>
                <hr style={styles.divider} />
                <div style={styles.actionsContainer}>
                    {/* Har button ab alag modal khol sakta hai */}
                    <div style={styles.actionButton} onClick={(e) => handleActionClick(e, 'post')}><Plus size={20} color="#4B5563" /><span>Photo</span></div>
                    <div style={styles.actionButton} onClick={(e) => handleActionClick(e, 'post')}><Video size={20} color="#4B5563" /><span>Video</span></div>
                    <div style={styles.actionButton} onClick={(e) => handleActionClick(e, 'live')}><Radio size={20} color="#4B5563" /><span>Live</span></div>
                </div>
            </div>

            {/* --- "CREATE POST" MODAL --- */}
            {modalType === 'post' && (
                <div style={styles.modalBackdrop}>
                    {/* ... (poora post modal ka code waisa hi hai) ... */}
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Create Post</h2>
                            <button style={styles.closeButton} onClick={closeModal}> <X size={24} color="#6B7280" /> </button>
                        </div>
                        <div style={styles.authorSection}>
                            <div style={styles.profileIcon}></div>
                            <span style={styles.modalAuthorName}>Yash Parse</span>
                        </div>
                        <textarea style={styles.textarea} placeholder="What do you want to talk about?" value={postText} onChange={(e) => setPostText(e.target.value)} autoFocus />
                        {previewUrl && ( <div style={styles.imagePreviewContainer}> <img src={previewUrl} alt="Preview" style={styles.imagePreview} /> </div> )}
                        <div style={styles.modalFooter}>
                            <div style={styles.mediaButtons}>
                                <button style={styles.mediaButton} onClick={() => fileInputRef.current?.click()}> <ImageIcon size={20} /> </button>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,video/*" />
                            </div>
                            <button style={(postText.trim() || selectedFile) ? styles.postButton : styles.postButtonDisabled} onClick={handlePost} disabled={!postText.trim() && !selectedFile}> Post </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* --- YEH NAYA "GO LIVE" MODAL HAI --- */}
            {modalType === 'live' && (
                <div style={styles.modalBackdrop}>
                     <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Go Live</h2>
                            <button style={styles.closeButton} onClick={closeModal}>
                                <X size={24} color="#6B7280" />
                            </button>
                        </div>
                        <div style={styles.goLiveBody}>
                            <div style={styles.liveIconContainer}>
                                <VideoIcon size={48} color="var(--brand-purple, #8B5CF6)" />
                            </div>
                            <h3 style={styles.goLiveTitle}>You are about to go live!</h3>
                            <p style={styles.goLiveText}>Your followers will be notified when you start the live video.</p>
                        </div>
                        <div style={styles.modalFooter}>
                            <button style={styles.goLiveButton} onClick={handleGoLive}>
                                Start Live Video
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};


// Naye "Go Live" modal ke liye styles add kiye hain
const styles: { [key: string]: React.CSSProperties } = {
    // --- Trigger Card Styles (No Change) ---
    card: { backgroundColor: 'white', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.07)', border: '1px solid #E5E7EB', cursor: 'pointer', },
    topRow: { display: 'flex', alignItems: 'center', width: '100%' },
    profileIcon: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E0E0E0', marginRight: '12px', flexShrink: 0 },
    inputMock: { flexGrow: 1, backgroundColor: '#F3F4F6', borderRadius: '20px', padding: '10px 16px', color: '#6B7280', fontSize: '15px' },
    divider: { border: 'none', borderTop: '1px solid #F3F4F6', margin: '12px 0' },
    actionsContainer: { display: 'flex', justifyContent: 'space-around', alignItems: 'center' },
    actionButton: { display: 'flex', alignItems: 'center', gap: '8px', color: '#4B5563', fontWeight: 500, fontSize: '14px', padding: '8px', borderRadius: '8px', transition: 'background-color 0.2s' },
    
    // --- Common Modal Styles ---
    modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', borderRadius: '12px', width: '90%', maxWidth: '550px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '80vh' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' },
    modalTitle: { margin: 0, fontSize: '20px', fontWeight: '600' },
    closeButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
    modalFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #E5E7EB', },

    // --- Create Post Modal Styles ---
    authorSection: { display: 'flex', alignItems: 'center', padding: '16px 20px 0 20px' },
    modalAuthorName: { fontWeight: '600' },
    textarea: { width: 'calc(100% - 40px)', minHeight: '150px', border: 'none', resize: 'none', fontSize: '16px', fontFamily: 'system-ui, sans-serif', padding: '12px 20px', outline: 'none', flexGrow: 1 },
    imagePreviewContainer: { padding: '0 20px', maxHeight: '200px', overflowY: 'auto' },
    imagePreview: { width: '100%', borderRadius: '8px', marginBottom: '12px' },
    mediaButtons: { display: 'flex', gap: '12px' },
    mediaButton: { background: '#F3F4F6', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' },
    postButton: { padding: '10px 20px', backgroundColor: 'var(--brand-purple, #8B5CF6)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' },
    postButtonDisabled: { padding: '10px 20px', backgroundColor: '#E5E7EB', color: '#9CA3AF', border: 'none', borderRadius: '20px', fontWeight: 'bold', fontSize: '16px', cursor: 'not-allowed' },
    
    // --- Go Live Modal Styles ---
    goLiveBody: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '32px 24px',
    },
    liveIconContainer: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '16px',
    },
    goLiveTitle: {
        margin: '0 0 8px 0',
        fontSize: '18px',
        fontWeight: '600',
    },
    goLiveText: {
        margin: 0,
        color: '#6B7280',
    },
    goLiveButton: {
        width: '100%',
        padding: '12px',
        backgroundColor: '#D92D20', // Red color for live
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '16px',
        cursor: 'pointer',
    },
};

export default CreatePost;

