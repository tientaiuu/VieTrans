import React from 'react';
import { CalendarDays } from 'lucide-react';
import { Clock3, Download, Eye, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { deleteHistory, getHistory, imageUrl, type HistoryItem } from '../../api';
import { useAppStore } from '../../stores/useAppStore';

const ITEMS_PER_PAGE = 6;
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DashboardPage: React.FC = () => {
  const { isLoggedIn, token, logout } = useAppStore();
  const [histories, setHistories] = React.useState<HistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [itemToDelete, setItemToDelete] = React.useState<string | null>(null);
  const [viewImageUrl, setViewImageUrl] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState('');
  const [pickerMode, setPickerMode] = React.useState<'calendar' | 'month' | 'year'>('calendar');
  const [yearPickerBase, setYearPickerBase] = React.useState(new Date().getFullYear());
  const [pendingMonth, setPendingMonth] = React.useState<number | null>(null);
  const [pendingYear, setPendingYear] = React.useState<number | null>(null);
  const [calendarMonth, setCalendarMonth] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const filterRef = React.useRef<HTMLDivElement | null>(null);
  const filterDate = searchParams.get('date') || '';

  React.useEffect(() => {
    if (!isLoggedIn || !token) {
      setLoading(false);
      setHistories([]);
      return;
    }

    setLoading(true);
    getHistory(token, {
      date: filterDate || undefined,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    })
      .then((data) => setHistories(data))
      .catch((err) => {
        console.error(err);
        if (err.message.includes('history')) {
          logout();
        }
      })
      .finally(() => setLoading(false));
  }, [filterDate, isLoggedIn, token, logout]);

  const rawPage = Number(searchParams.get('page') || '1');
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const totalPages = Math.max(1, Math.ceil(histories.length / ITEMS_PER_PAGE));
  const paginatedHistories = histories.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  React.useEffect(() => {
    if (currentPage === 1 && searchParams.get('page') === null) {
      return;
    }

    if (currentPage > totalPages) {
      const nextParams = new URLSearchParams(searchParams);
      if (totalPages <= 1) {
        nextParams.delete('page');
      } else {
        nextParams.set('page', String(totalPages));
      }
      setSearchParams(nextParams, { replace: true });
      return;
    }

    if (rawPage !== currentPage) {
      const nextParams = new URLSearchParams(searchParams);
      if (currentPage === 1) {
        nextParams.delete('page');
      } else {
        nextParams.set('page', String(currentPage));
      }
      setSearchParams(nextParams, { replace: true });
    }
  }, [currentPage, rawPage, searchParams, setSearchParams, totalPages]);

  React.useEffect(() => {
    if (!isFilterOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false);
        setPickerMode('calendar');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isFilterOpen]);

  React.useEffect(() => {
    setSelectedDate(filterDate);
    if (filterDate) {
      const [year, month, day] = filterDate.split('-').map(Number);
      if (year && month && day) {
        setCalendarMonth(new Date(year, month - 1, 1));
      }
    }
  }, [filterDate]);

  const goToPage = (page: number) => {
    const nextParams = new URLSearchParams(searchParams);
    if (page <= 1) {
      nextParams.delete('page');
    } else {
      nextParams.set('page', String(page));
    }
    setSearchParams(nextParams);
  };

  const applyDateFilter = (date: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (date) {
      nextParams.set('date', date);
    } else {
      nextParams.delete('date');
    }
    nextParams.delete('page');
    setSearchParams(nextParams);
  };

  const monthLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
  });
  const yearLabel = String(calendarMonth.getFullYear());

  const selectedDateObj = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null;

  const calendarDays = React.useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const cells: Array<{ key: string; day: number; date: Date; isCurrentMonth: boolean }> = [];

    for (let index = startOffset - 1; index >= 0; index -= 1) {
      const day = daysInPrevMonth - index;
      cells.push({
        key: `prev-${day}`,
        day,
        date: new Date(year, month - 1, day),
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        key: `current-${day}`,
        day,
        date: new Date(year, month, day),
        isCurrentMonth: true,
      });
    }

    const trailingDays = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= trailingDays; day += 1) {
      cells.push({
        key: `next-${day}`,
        day,
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [calendarMonth]);

  const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const handleDateSelect = (date: Date) => {
    setSelectedDate(formatLocalDate(date));
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const openMonthPicker = () => {
    setPendingMonth(calendarMonth.getMonth());
    setPickerMode('month');
  };

  const openYearPicker = () => {
    setPendingYear(calendarMonth.getFullYear());
    setYearPickerBase(calendarMonth.getFullYear());
    setPickerMode('year');
  };

  const handleBackToCalendar = () => {
    setPendingMonth(null);
    setPendingYear(null);
    setPickerMode('calendar');
  };

  const handlePickerSelect = () => {
    if (pickerMode === 'month' && pendingMonth !== null) {
      setCalendarMonth(new Date(calendarMonth.getFullYear(), pendingMonth, 1));
    }

    if (pickerMode === 'year' && pendingYear !== null) {
      setCalendarMonth(new Date(pendingYear, calendarMonth.getMonth(), 1));
      setYearPickerBase(pendingYear);
    }

    handleBackToCalendar();
  };

  const yearOptions = React.useMemo(() => {
    const center = yearPickerBase;
    return Array.from({ length: 12 }, (_, index) => center - 5 + index);
  }, [yearPickerBase]);

  const handlePreviousNav = () => {
    if (pickerMode === 'year') {
      setYearPickerBase((current) => current - 12);
      return;
    }

    if (pickerMode === 'month') {
      setCalendarMonth((current) => new Date(current.getFullYear() - 1, current.getMonth(), 1));
      return;
    }

    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const handleNextNav = () => {
    if (pickerMode === 'year') {
      setYearPickerBase((current) => current + 12);
      return;
    }

    if (pickerMode === 'month') {
      setCalendarMonth((current) => new Date(current.getFullYear() + 1, current.getMonth(), 1));
      return;
    }

    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  const handleDownload = (url: string, filename: string) => {
    const downloadUrl = url + (url.includes('?') ? '&' : '?') + 'download=true';
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const confirmDelete = async () => {
    if (!token || !itemToDelete) return;

    try {
      await deleteHistory(itemToDelete, token);
      setHistories((prev) => prev.filter((item) => item.id !== itemToDelete));
      setItemToDelete(null);
    } catch (err) {
      console.error('Failed to delete history:', err);
      alert('Failed to delete history');
    }
  };

  const deleteModal = itemToDelete ? createPortal(
    <div className="dashboard-delete-modal">
      <button
        type="button"
        className="dashboard-delete-backdrop"
        aria-label="Close delete dialog"
        onClick={() => setItemToDelete(null)}
      />
      <div className="dashboard-delete-panel" role="dialog" aria-modal="true" aria-labelledby="dashboard-delete-title">
        <div className="dashboard-delete-icon-wrap">
          <span className="dashboard-delete-icon-ring" />
          <Trash2 className="dashboard-delete-icon" size={28} />
        </div>
        <h3 id="dashboard-delete-title" className="dashboard-delete-title">
          Remove this record?
        </h3>
        <p className="dashboard-delete-copy">
          This action will permanently remove the selected item from your translation history.
        </p>
        <div className="dashboard-delete-actions">
          <button
            type="button"
            className="dashboard-delete-btn is-secondary"
            onClick={() => setItemToDelete(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dashboard-delete-btn is-danger"
            onClick={confirmDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  const viewImageModal = viewImageUrl ? createPortal(
    <div className="dashboard-delete-modal">
      <button
        type="button"
        className="dashboard-delete-backdrop"
        aria-label="Close image preview"
        onClick={() => setViewImageUrl(null)}
      />
      <div className="dashboard-image-panel" role="dialog" aria-modal="true" aria-label="Translated image preview">
        <button
          type="button"
          className="dashboard-image-close"
          aria-label="Close image preview"
          onClick={() => setViewImageUrl(null)}
        >
          ×
        </button>
        <img src={viewImageUrl} alt="Translated preview" className="dashboard-image-preview" />
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="dw fup">
      <div className="page-top dashboard-page-top">
        <div>
          <h1 className="page-h">Translation History</h1>
          <p className="docs-p">Manage and review your image translation history.</p>
        </div>

        <div
          className="activity-filter-group dashboard-filter-group"
          role="tablist"
          aria-label="Dashboard history filters"
          ref={filterRef}
        >
          <button
            type="button"
            className={`activity-filter-chip${!filterDate ? ' is-active' : ''}`}
            onClick={() => {
              setSelectedDate('');
              applyDateFilter('');
            }}
          >
            All
          </button>
          <button
            type="button"
            className={`activity-filter-chip${isFilterOpen || !!filterDate ? ' is-active' : ''}`}
            onClick={() => {
              setIsFilterOpen((open) => {
                const next = !open;
                if (!next) setPickerMode('calendar');
                return next;
              });
            }}
            aria-expanded={isFilterOpen}
            aria-haspopup="dialog"
          >
            <span>Filter</span>
            <CalendarDays size={16} />
          </button>

          {isFilterOpen && (
            <div className="dashboard-filter-panel" role="dialog" aria-label="Choose a date">
              <div className="dashboard-calendar-head">
                <div className="dashboard-calendar-title">
                  <button
                    type="button"
                    className="dashboard-calendar-title-btn"
                    onClick={openMonthPicker}
                  >
                    {monthLabel}
                  </button>
                  <button
                    type="button"
                    className="dashboard-calendar-title-btn"
                    onClick={openYearPicker}
                  >
                    {yearLabel}
                  </button>
                </div>
                <div className="dashboard-calendar-navs">
                  <button
                    type="button"
                    className="dashboard-calendar-nav"
                    aria-label="Previous month"
                    onClick={handlePreviousNav}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="dashboard-calendar-nav"
                    aria-label="Next month"
                    onClick={handleNextNav}
                  >
                    ↓
                  </button>
                </div>
              </div>

              {pickerMode === 'calendar' && (
                <>
                  <div className="dashboard-calendar-weekdays">
                    {WEEKDAY_LABELS.map((label, index) => (
                      <span key={`${label}-${index}`}>{label}</span>
                    ))}
                  </div>

                  <div className="dashboard-calendar-grid">
                    {calendarDays.map(({ key, day, date, isCurrentMonth }) => (
                      <button
                        key={key}
                        type="button"
                        className={`dashboard-calendar-day${isCurrentMonth ? '' : ' is-outside'}${selectedDateObj && isSameDay(date, selectedDateObj) ? ' is-selected' : ''}`}
                        onClick={() => handleDateSelect(date)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {pickerMode === 'month' && (
                <div className="dashboard-picker-grid">
                  {MONTH_LABELS.map((month, index) => (
                    <button
                      key={month}
                      type="button"
                      className={`dashboard-picker-item${(pendingMonth ?? calendarMonth.getMonth()) === index ? ' is-active' : ''}`}
                      onClick={() => setPendingMonth(index)}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              )}

              {pickerMode === 'year' && (
                <div className="dashboard-picker-grid dashboard-picker-grid-years">
                  {yearOptions.map((year) => (
                    <button
                      key={year}
                      type="button"
                      className={`dashboard-picker-item${(pendingYear ?? calendarMonth.getFullYear()) === year ? ' is-active' : ''}`}
                      onClick={() => setPendingYear(year)}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}

              <div className="dashboard-calendar-actions">
                {pickerMode === 'calendar' ? (
                  <>
                    <button type="button" className="dashboard-calendar-link" onClick={() => { handleDateSelect(new Date()); setPickerMode('calendar'); }}>
                      Today
                    </button>
                    <button
                      type="button"
                      className="dashboard-calendar-link"
                      onClick={() => {
                        applyDateFilter(selectedDate);
                        setIsFilterOpen(false);
                        setPickerMode('calendar');
                      }}
                    >
                      Select
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="dashboard-calendar-link dashboard-calendar-back" onClick={handleBackToCalendar}>
                      <span aria-hidden="true">←</span>
                      <span>Back</span>
                    </button>
                    <button type="button" className="dashboard-calendar-link" onClick={handlePickerSelect}>
                      Select
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-history-shell">
        <div className="dashboard-history-list">
          {loading ? (
            <div className="dashboard-history-state">Loading history...</div>
          ) : !isLoggedIn || !token ? (
            <div className="dashboard-history-state">Sign in to view your saved translation history.</div>
          ) : histories.length === 0 ? (
            filterDate ? (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-art" aria-hidden="true">
                  <span className="dashboard-empty-digit is-left">4</span>
                  <span className="dashboard-empty-digit is-center">0</span>
                  <span className="dashboard-empty-digit is-right">4</span>
                  <span className="dashboard-empty-orb orb-a" />
                  <span className="dashboard-empty-orb orb-b" />
                  <span className="dashboard-empty-orb orb-c" />
                </div>
                <p className="dashboard-empty-copy">No translation history found.</p>
              </div>
            ) : (
              <div className="dashboard-history-state">No translation history found.</div>
            )
          ) : (
            paginatedHistories.map((item) => {
              const formattedDate = new Date(item.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const translatedUrl = imageUrl(item.stages.result || item.stages.fuse || item.stages.input);

              return (
                <article className="activity-card dashboard-activity-card" key={item.id}>
                  <div className="activity-card-top">
                    <div className="activity-card-meta">
                      <span className="activity-language-pill">English → Vietnamese</span>
                      <span className="activity-meta-dot" aria-hidden="true" />
                      <span className="activity-meta-time">
                        <Clock3 size={14} />
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="activity-card-media dashboard-activity-media">
                    <div className="dashboard-activity-thumb">
                      <img
                        src={imageUrl(item.stages.input)}
                        className="w-full h-full object-contain"
                        alt="Original"
                      />
                      <span className="dashboard-activity-label">Original</span>
                    </div>

                    <div className="dashboard-activity-thumb is-translated">
                      <img
                        src={translatedUrl}
                        className="w-full h-full object-contain dashboard-translated-image"
                        alt="Translated"
                      />
                      <span className="dashboard-activity-label is-translated">Translated</span>
                    </div>
                  </div>

                  <div className="activity-card-actions dashboard-activity-actions">
                    <button
                      type="button"
                      className="activity-primary-action"
                      onClick={() => setViewImageUrl(translatedUrl)}
                    >
                      <Eye size={16} />
                      <span>View Image</span>
                    </button>

                    <div className="activity-secondary-actions">
                      <button
                        type="button"
                        className="activity-secondary-action"
                        onClick={() => handleDownload(translatedUrl, `vietrans-${item.id}.jpg`)}
                      >
                        <Download size={16} />
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        className="activity-icon-action"
                        aria-label="Delete history item"
                        onClick={() => setItemToDelete(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {!loading && isLoggedIn && token && histories.length > ITEMS_PER_PAGE && (
          <div className="dashboard-pagination">
            <button
              type="button"
              className="dashboard-page-btn"
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <div className="dashboard-page-numbers" aria-label="Pagination">
              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1;

                return (
                  <button
                    key={page}
                    type="button"
                    className={`dashboard-page-number${page === currentPage ? ' is-active' : ''}`}
                    onClick={() => goToPage(page)}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="dashboard-page-btn"
              onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {deleteModal}
      {viewImageModal}
    </div>
  );
};
