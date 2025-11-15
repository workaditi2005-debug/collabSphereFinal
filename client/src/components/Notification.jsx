import React, { useState } from 'react';
import './Notification.css';
import { authAPI } from '../utils/api';
import { AVAILABLE_SKILLS } from '../utils/constants';

const Notification = ({
    notifications,
    onMarkAsRead,
    onAcceptRequest,
    onRejectRequest,
    onClearNotification
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [detailId, setDetailId] = useState(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    const getNotificationMsg = n => {
        switch (n.type) {
            case 'request_sent_pending':
                return `Request sent to ${n.recipient} for “${n.project}” — Pending approval.`;
            case 'request_accepted':
                return `${n.recipient} accepted your request for “${n.project}”.`;
            case 'request_rejected':
                return `${n.recipient} rejected your request for “${n.project}”.`;
            case 'incoming_request':
                return `${n.sender} wants to collaborate on “${n.project}”.`;
            default:
                return n.message;
        }
    };

    const handleExpand = id => setDetailId(id === detailId ? null : id);

    return (
        <div className="notification-center">
            <button
                className={`notification-bell${unreadCount > 0 ? ' has-unread' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="bell-icon">🔔</span>
                {unreadCount > 0 && <span className="noti-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="noti-dropdown">
                    <div className="noti-header">
                        Notifications
                        <button
                            className="noti-clear"
                            onClick={onClearNotification}
                            title="Clear all notifications"
                        >✖</button>
                    </div>
                    {notifications.length === 0 && (
                        <div className="noti-empty">No notifications</div>
                    )}
                    <div className="noti-list">
                        {notifications.map(n => (
                            <div key={n.id} className={`noti-item${n.read ? '' : ' unread'}`}>
                                <div
                                    className="noti-main"
                                    onClick={() => {
                                        onMarkAsRead(n.id);
                                        handleExpand(n.id);
                                    }}
                                >
                                    <span className="noti-msg">{getNotificationMsg(n)}</span>
                                    <span className="noti-time">{n.timestamp}</span>
                                </div>
                                {/* Detail view if expanded */}
                                {detailId === n.id && (
                                    <div className="noti-detail">
                                        <div><strong>Details:</strong></div>
                                        {n.project && <div>Project: <b>{n.project}</b></div>}
                                        {n.sender && <div>From: <b>{n.sender}</b></div>}
                                        {n.type === 'incoming_request' && (
                                            <div className="noti-action">
                                                <button className="accept" onClick={() => onAcceptRequest(n.id)}>Accept</button>
                                                <button className="reject" onClick={() => onRejectRequest(n.id)}>Reject</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notification;
