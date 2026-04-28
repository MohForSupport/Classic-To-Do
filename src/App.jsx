import { useEffect, useMemo, useState } from "react";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";

const STORAGE_KEY = "kfupm-to-do-tasks-v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const SEMESTERS = [
  { code: "252", start: "2026-01-11", end: "2026-05-20" },
  { code: "261", start: "2026-08-19", end: "2026-12-24" },
  { code: "262", start: "2027-01-10", end: "2027-06-06" },
  { code: "263", start: "2027-01-30", end: "2027-08-15" },
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function parseDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function daysBetweenInclusive(startDate, endDate) {
  return Math.floor((endDate - startDate) / MS_PER_DAY) + 1;
}

function minDate(firstDate, secondDate) {
  return firstDate <= secondDate ? firstDate : secondDate;
}

function formatShortDate(date) {
  return MONTH_FORMATTER.format(date);
}

function createWeeks(semester) {
  const semesterStart = parseDate(semester.start);
  const semesterEnd = parseDate(semester.end);
  const weekCount = Math.ceil(daysBetweenInclusive(semesterStart, semesterEnd) / 7);

  return Array.from({ length: weekCount }, (_, index) => {
    const startDate = addDays(semesterStart, index * 7);
    const endDate = minDate(addDays(startDate, 6), semesterEnd);

    return {
      number: index + 1,
      startDate,
      endDate,
      startISO: formatISO(startDate),
      endISO: formatISO(endDate),
      label: `Week ${index + 1} - ${formatShortDate(startDate)} to ${formatShortDate(endDate)}`,
    };
  });
}

function getDaysForWeek(week) {
  return DAY_NAMES.map((name, weekdayIndex) => {
    let matchingDate = null;

    for (let offset = 0; offset < 7; offset += 1) {
      const candidateDate = addDays(week.startDate, offset);
      if (candidateDate > week.endDate) {
        break;
      }

      if (candidateDate.getDay() === weekdayIndex) {
        matchingDate = candidateDate;
        break;
      }
    }

    return {
      name,
      date: matchingDate,
      iso: matchingDate ? formatISO(matchingDate) : null,
      enabled: Boolean(matchingDate),
    };
  });
}

function readStoredTasks() {
  try {
    const storedTasks = localStorage.getItem(STORAGE_KEY);
    return storedTasks ? JSON.parse(storedTasks) : [];
  } catch {
    return [];
  }
}

function createTaskId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function SemesterSelector({ semesters, selectedSemesterCode, onChange }) {
  return (
    <section className="semester-panel" aria-label="Semester selector">
      <div>
        <p className="eyebrow">KFUPM To Do</p>
        <h1>Semester notebook</h1>
      </div>

      <label className="semester-select-label">
        <span>Semester</span>
        <select
          value={selectedSemesterCode}
          onChange={(event) => onChange(event.target.value)}
        >
          {semesters.map((semester) => (
            <option key={semester.code} value={semester.code}>
              {semester.code}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function WeekAccordion({ weeks, selectedWeekNumber, examWeekNumbers, onSelectWeek, children }) {
  return (
    <section className="weeks" aria-label="Semester weeks">
      {weeks.map((week) => {
        const isOpen = week.number === selectedWeekNumber;
        const hasExam = examWeekNumbers.has(week.number);

        return (
          <article
            className={`week-card ${isOpen ? "is-open" : ""} ${hasExam ? "has-exam" : ""}`}
            key={week.number}
          >
            <button
              className="week-header"
              type="button"
              aria-expanded={isOpen}
              onClick={() => onSelectWeek(week)}
            >
              <span>{week.label}</span>
              <span className="week-chevron" aria-hidden="true">
                {isOpen ? "-" : "+"}
              </span>
            </button>

            {isOpen && <div className="week-content">{children}</div>}
          </article>
        );
      })}
    </section>
  );
}

function DayTabs({ days, selectedDate, examDates, onSelectDate }) {
  return (
    <div className="day-tabs" role="tablist" aria-label="Days">
      {days.map((day) => {
        const hasExam = Boolean(day.iso && examDates.has(day.iso));

        return (
          <button
            key={day.name}
            className={`day-tab ${day.iso === selectedDate ? "is-active" : ""} ${
              hasExam ? "has-exam" : ""
            }`}
            type="button"
            role="tab"
            aria-selected={day.iso === selectedDate}
            disabled={!day.enabled}
            onClick={() => day.enabled && onSelectDate(day.iso)}
          >
            <span>{day.name}</span>
            <small>{day.date ? formatShortDate(day.date) : "Outside"}</small>
          </button>
        );
      })}
    </div>
  );
}

function Icon({ name }) {
  const icons = {
    add: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    remove: (
      <>
        <path d="M5 12h14" />
        <path d="M8 8l8 8" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M7 6l1 14h8l1-14" />
        <path d="M10 10v6" />
        <path d="M14 10v6" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {icons[name]}
    </svg>
  );
}

function TaskActions({ deleteMode, editMode, onAdd, onToggleDeleteMode, onToggleEditMode }) {
  return (
    <div className="task-actions" aria-label="Task actions">
      <button className="action-button action-add" type="button" onClick={onAdd}>
        <Icon name="add" />
        <span>Add Task</span>
      </button>
      <button
        className={`action-button action-remove ${deleteMode ? "is-active" : ""}`}
        type="button"
        onClick={onToggleDeleteMode}
        aria-pressed={deleteMode}
      >
        <Icon name="trash" />
        <span>Remove Task</span>
      </button>
      <button
        className={`action-button action-edit ${editMode ? "is-active" : ""}`}
        type="button"
        onClick={onToggleEditMode}
        aria-pressed={editMode}
      >
        <Icon name="edit" />
        <span>Edit Task</span>
      </button>
    </div>
  );
}

function NotebookCheckbox({ task, onToggle }) {
  return (
    <label className={`notebook-checkbox ${task.isExam ? "is-exam" : ""}`}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={(event) => onToggle(task.id, event.target.checked)}
      />
      <span className="checkmark"></span>
      <span className="text">
        <span className="text-content">{task.text}</span>
        <svg preserveAspectRatio="none" viewBox="0 0 400 20" className="cut-line">
          <path d="M0,10 H400"></path>
        </svg>
      </span>
    </label>
  );
}

function DeleteTaskButton({ onClick }) {
  return (
    <button className="delete-button" type="button" onClick={onClick} aria-label="Delete task">
      <Icon name="trash" />
    </button>
  );
}

function EditTaskButton({ onClick }) {
  return (
    <button className="edit-task-button" type="button" onClick={onClick} aria-label="Edit task">
      <Icon name="edit" />
    </button>
  );
}

function TaskList({
  tasks,
  deleteMode,
  editMode,
  onToggleTask,
  onDeleteTask,
  onEditTask,
}) {
  if (tasks.length === 0) {
    return (
      <div className="empty-page">
        <span>No tasks on this page yet.</span>
      </div>
    );
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li className="task-row" key={task.id}>
          {deleteMode && <DeleteTaskButton onClick={() => onDeleteTask(task.id)} />}
          {editMode && <EditTaskButton onClick={() => onEditTask(task)} />}
          <NotebookCheckbox task={task} onToggle={onToggleTask} />
        </li>
      ))}
    </ul>
  );
}

function TaskModal({ mode, initialText = "", initialIsExam = false, onCancel, onSubmit }) {
  const [text, setText] = useState(initialText);
  const [isExam, setIsExam] = useState(initialIsExam);
  const isEditing = mode === "edit";

  useEffect(() => {
    setText(initialText);
    setIsExam(initialIsExam);
  }, [initialText, initialIsExam]);

  function handleSubmit(event) {
    event.preventDefault();
    const cleanedText = text.trim();
    if (!cleanedText) {
      return;
    }

    onSubmit({ text: cleanedText, isExam });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <form
        className="task-modal"
        aria-label={isEditing ? "Edit task" : "Add task"}
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-pin"></div>
        <h2>{isEditing ? "Edit task" : "Add task"}</h2>
        <textarea
          autoFocus
          value={text}
          placeholder="Write the task..."
          onChange={(event) => setText(event.target.value)}
        />

        <label className="exam-toggle">
          <input
            type="checkbox"
            checked={isExam}
            onChange={(event) => setIsExam(event.target.checked)}
          />
          <span>Is this activity an exam?</span>
        </label>

        <div className="modal-actions">
          <button className="cancel-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="submit-button type1" type="submit">
            <span className="btn-txt">Submit</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function HandDrawnFilter() {
  return (
    <svg className="hand-drawn-filter" height="0" width="0" aria-hidden="true">
      <filter id="handDrawnNoise">
        <feTurbulence
          result="noise"
          numOctaves="8"
          baseFrequency="0.1"
          type="fractalNoise"
        ></feTurbulence>
        <feDisplacementMap
          yChannelSelector="G"
          xChannelSelector="R"
          scale="3"
          in2="noise"
          in="SourceGraphic"
        ></feDisplacementMap>
      </filter>
    </svg>
  );
}

function ShaderBackground() {
  return (
    <div className="shader-background" aria-hidden="true">
      <ShaderGradientCanvas
        className="shader-gradient-canvas"
        pointerEvents="none"
        pixelDensity={1}
        fov={45}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <ShaderGradient
          control="props"
          animate="on"
          axesHelper="off"
          bgColor1="#000000"
          bgColor2="#000000"
          brightness={1}
          cAzimuthAngle={180}
          cDistance={2.8}
          cPolarAngle={80}
          cameraZoom={9.1}
          color1="#6d8071"
          color2="#c7caae"
          color3="#212121"
          destination="onCanvas"
          embedMode="off"
          envPreset="city"
          format="gif"
          fov={45}
          frameRate={10}
          gizmoHelper="hide"
          grain="on"
          lightType="3d"
          pixelDensity={1}
          positionX={0}
          positionY={0}
          positionZ={0}
          range="disabled"
          rangeEnd={40}
          rangeStart={0}
          reflection={0.1}
          rotationX={50}
          rotationY={0}
          rotationZ={-60}
          shader="defaults"
          type="waterPlane"
          uAmplitude={0}
          uDensity={1.5}
          uFrequency={0}
          uSpeed={0.3}
          uStrength={1.5}
          uTime={8}
          wireframe={false}
        />
      </ShaderGradientCanvas>
    </div>
  );
}

function App() {
  const [selectedSemesterCode, setSelectedSemesterCode] = useState(SEMESTERS[0].code);
  const selectedSemester = useMemo(
    () => SEMESTERS.find((semester) => semester.code === selectedSemesterCode) ?? SEMESTERS[0],
    [selectedSemesterCode],
  );
  const weeks = useMemo(() => createWeeks(selectedSemester), [selectedSemester]);

  const [selectedWeekNumber, setSelectedWeekNumber] = useState(1);
  const selectedWeek = weeks.find((week) => week.number === selectedWeekNumber) ?? weeks[0];
  const weekDays = useMemo(() => getDaysForWeek(selectedWeek), [selectedWeek]);
  const [selectedDate, setSelectedDate] = useState(selectedWeek.startISO);
  const [tasks, setTasks] = useState(readStoredTasks);
  const [deleteMode, setDeleteMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [modalState, setModalState] = useState({ type: null, task: null });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const startDate = selectedWeek.startISO;
    const selectedDayStillVisible = weekDays.some(
      (day) => day.enabled && day.iso === selectedDate,
    );

    if (!selectedDayStillVisible) {
      setSelectedDate(startDate);
    }
  }, [selectedDate, selectedWeek.startISO, weekDays]);

  function handleSemesterChange(nextSemesterCode) {
    const nextSemester = SEMESTERS.find((semester) => semester.code === nextSemesterCode);
    const nextWeek = createWeeks(nextSemester)[0];

    setSelectedSemesterCode(nextSemesterCode);
    setSelectedWeekNumber(1);
    setSelectedDate(nextWeek.startISO);
    setDeleteMode(false);
    setEditMode(false);
  }

  function handleSelectWeek(week) {
    setSelectedWeekNumber(week.number);
    setSelectedDate(week.startISO);
    setDeleteMode(false);
    setEditMode(false);
  }

  function handleAddTask({ text, isExam }) {
    const selectedDay = weekDays.find((day) => day.iso === selectedDate);
    const newTask = {
      id: createTaskId(),
      text,
      isExam,
      completed: false,
      semester: selectedSemester.code,
      weekNumber: selectedWeek.number,
      day: selectedDay?.name ?? "",
      date: selectedDate,
    };

    setTasks((currentTasks) => [newTask, ...currentTasks]);
    setModalState({ type: null, task: null });
  }

  function handleToggleTask(taskId, completed) {
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? { ...task, completed } : task)),
    );
  }

  function handleDeleteTask(taskId) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
  }

  function handleEditTask({ text, isExam }) {
    const editingTask = modalState.task;
    if (!editingTask) {
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === editingTask.id ? { ...task, text, isExam } : task,
      ),
    );
    setModalState({ type: null, task: null });
  }

  const semesterExamTasks = useMemo(
    () => tasks.filter((task) => task.semester === selectedSemester.code && task.isExam),
    [tasks, selectedSemester.code],
  );

  const examDates = useMemo(
    () => new Set(semesterExamTasks.map((task) => task.date)),
    [semesterExamTasks],
  );

  const examWeekNumbers = useMemo(
    () => new Set(semesterExamTasks.map((task) => task.weekNumber)),
    [semesterExamTasks],
  );

  const visibleTasks = tasks
    .filter(
      (task) =>
        task.semester === selectedSemester.code &&
        task.weekNumber === selectedWeek.number &&
        task.date === selectedDate,
    )
    .sort((firstTask, secondTask) =>
      Number(Boolean(secondTask.isExam)) - Number(Boolean(firstTask.isExam)),
  );

  const selectedDay = weekDays.find((day) => day.iso === selectedDate);
  const selectedDateLabel = selectedDay?.date
    ? FULL_DATE_FORMATTER.format(selectedDay.date)
    : selectedWeek.label;

  return (
    <>
      <HandDrawnFilter />
      <ShaderBackground />
      <main className="app-shell">
        <div className="notebook-card">
          <SemesterSelector
            semesters={SEMESTERS}
            selectedSemesterCode={selectedSemesterCode}
            onChange={handleSemesterChange}
          />

          <div className="semester-meta">
            <span>{formatShortDate(parseDate(selectedSemester.start))}</span>
            <strong>{weeks.length} weeks</strong>
            <span>{formatShortDate(parseDate(selectedSemester.end))}</span>
          </div>

          <WeekAccordion
            weeks={weeks}
            selectedWeekNumber={selectedWeek.number}
            examWeekNumbers={examWeekNumbers}
            onSelectWeek={handleSelectWeek}
          >
            <DayTabs
              days={weekDays}
              selectedDate={selectedDate}
              examDates={examDates}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setDeleteMode(false);
                setEditMode(false);
              }}
            />

            <section className="task-area" aria-label="Task area">
              <div className="task-area-header">
                <div>
                  <p className="eyebrow">Page date</p>
                  <h2>{selectedDateLabel}</h2>
                </div>
                <TaskActions
                  deleteMode={deleteMode}
                  editMode={editMode}
                  onAdd={() => setModalState({ type: "add", task: null })}
                  onToggleDeleteMode={() => {
                    setDeleteMode((current) => !current);
                    setEditMode(false);
                  }}
                  onToggleEditMode={() => {
                    setEditMode((current) => !current);
                    setDeleteMode(false);
                  }}
                />
              </div>

              <TaskList
                tasks={visibleTasks}
                deleteMode={deleteMode}
                editMode={editMode}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onEditTask={(task) => setModalState({ type: "edit", task })}
              />
            </section>
          </WeekAccordion>
        </div>
      </main>

      {modalState.type && (
        <TaskModal
          mode={modalState.type}
          initialText={modalState.task?.text ?? ""}
          initialIsExam={modalState.task?.isExam ?? false}
          onCancel={() => setModalState({ type: null, task: null })}
          onSubmit={modalState.type === "edit" ? handleEditTask : handleAddTask}
        />
      )}
    </>
  );
}

export default App;
