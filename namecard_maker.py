import sys
import pandas as pd
import os
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QGraphicsScene, QGraphicsView, QToolBar,
    QAction, QFileDialog, QGraphicsPixmapItem, QGraphicsTextItem,
    QGraphicsItemGroup, QMenu, QInputDialog, QMessageBox, QLabel,
    QLineEdit, QPushButton, QWidget, QHBoxLayout, QDialog, QVBoxLayout,
    QCheckBox, QListWidget, QListWidgetItem, QDockWidget, QSlider, QGroupBox, QFormLayout,
    QGraphicsItem
)
from PyQt5.QtGui import QPixmap, QPainter, QFont, QPen, QColor, QFontDatabase, QTransform
from PyQt5.QtCore import Qt, QRectF, pyqtSignal
from PyQt5.QtPrintSupport import QPrinter, QPrintDialog, QPrintPreviewDialog

os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"
os.environ["QT_SCALE_FACTOR"] = "1"
os.environ["QT_ENABLE_HIGHDPI_SCALING"] = "1"

class CenteredTextItem(QGraphicsTextItem):
    positionChanged = pyqtSignal(float, float)  # x, y
    def __init__(self, text="", font_size=20):
        super().__init__(text)
        self.setFlags(QGraphicsTextItem.ItemIsMovable | QGraphicsTextItem.ItemIsSelectable)
        self.setFlag(QGraphicsItem.ItemSendsGeometryChanges, True)
        self.setTextInteractionFlags(Qt.NoTextInteraction)
        self.setFont(QFont("", font_size))
        option = self.document().defaultTextOption()
        option.setAlignment(Qt.AlignCenter)
        self.document().setDefaultTextOption(option)
        self._recenterLocal()

    def setPlainText(self, text):
        old_center_scene = self.mapToScene(self.boundingRect().center())
        super().setPlainText(text)
        option = self.document().defaultTextOption()
        option.setAlignment(Qt.AlignCenter)
        self.document().setDefaultTextOption(option)
        self._recenterLocal()
        new_center_scene = self.mapToScene(self.boundingRect().center())
        offset = old_center_scene - new_center_scene
        self.moveBy(offset.x(), offset.y())

    def _recenterLocal(self):
        br = self.boundingRect()
        cx = br.center().x()
        cy = br.center().y()
        transform = QTransform()
        transform.translate(-cx, -cy)
        self.setTransform(transform)

    def itemChange(self, change, value):
        if change == QGraphicsItem.ItemPositionChange and self.scene():
            new_pos = value
            self.positionChanged.emit(new_pos.x(), new_pos.y())
        return super().itemChange(change, value)

    def contextMenuEvent(self, event):
        menu = QMenu()
        adjustAction = menu.addAction("폰트 크기 조절")
        boldAction = menu.addAction("볼드체 토글")
        action = menu.exec_(event.screenPos())
        if action == adjustAction:
            current_font = self.font()
            current_size = current_font.pointSize() if current_font.pointSize() > 0 else 20
            new_size, ok = QInputDialog.getInt(None, "폰트 크기 조절", 
                                             "폰트 크기를 입력하세요:", 
                                             current_size, 1, 500, 1)
            if ok:
                current_font.setPointSize(new_size)
                self.setFont(current_font)
        elif action == boldAction:
            current_font = self.font()
            current_font.setBold(not current_font.bold())
            self.setFont(current_font)
        else:
            super().contextMenuEvent(event)

class DraggablePixmapItem(QGraphicsPixmapItem):
    def __init__(self, pixmap):
        super().__init__(pixmap)
        self.setFlags(QGraphicsPixmapItem.ItemIsMovable | 
                     QGraphicsPixmapItem.ItemIsSelectable)
        self.original_pixmap = pixmap

    def contextMenuEvent(self, event):
        menu = QMenu()
        resizeAction = menu.addAction("이미지 크기 조절")
        action = menu.exec_(event.screenPos())
        if action == resizeAction:
            factor = 144 / 2.54  # DPI to cm conversion
            orig_width = self.original_pixmap.width()
            orig_height = self.original_pixmap.height()
            default_width_cm = orig_width / factor if orig_width > 0 else 5.0
            default_height_cm = orig_height / factor if orig_height > 0 else 5.0
            
            new_width_cm, ok1 = QInputDialog.getDouble(
                None, "이미지 크기 조절", "가로(cm)를 입력하세요:", 
                default_width_cm, 0.1, 1000, 2)
            if not ok1:
                return
                
            new_height_cm, ok2 = QInputDialog.getDouble(
                None, "이미지 크기 조절", "세로(cm)를 입력하세요:", 
                default_height_cm, 0.1, 1000, 2)
            if not ok2:
                return
                
            new_width_px = int(round(new_width_cm * factor))
            new_height_px = int(round(new_height_cm * factor))
            new_pixmap = self.original_pixmap.scaled(
                new_width_px, new_height_px, 
                Qt.IgnoreAspectRatio, Qt.SmoothTransformation)
            self.setPixmap(new_pixmap)
        else:
            super().contextMenuEvent(event)

class FontSelectionDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("시스템 폰트 선택")
        self.resize(300, 400)
        layout = QVBoxLayout()
        self.list_widget = QListWidget()
        font_families = QFontDatabase().families()
        self.list_widget.addItems(font_families)
        layout.addWidget(self.list_widget)
        self.ok_button = QPushButton("선택")
        self.ok_button.clicked.connect(self.accept)
        layout.addWidget(self.ok_button)
        self.setLayout(layout)
    
    def selected_font(self):
        return self.list_widget.currentItem().text() if self.list_widget.currentItem() else None

class RecordDialog(QDialog):
    def __init__(self, parent=None, record=None):
        super().__init__(parent)
        self.setWindowTitle("명단 추가/수정")
        layout = QVBoxLayout(self)
        
        self.company_label = QLabel("회사명:")
        self.company_edit = QLineEdit()
        layout.addWidget(self.company_label)
        layout.addWidget(self.company_edit)
        
        self.name_label = QLabel("이름:")
        self.name_edit = QLineEdit()
        layout.addWidget(self.name_label)
        layout.addWidget(self.name_edit)
        
        self.title_label = QLabel("직급:")
        self.title_edit = QLineEdit()
        layout.addWidget(self.title_label)
        layout.addWidget(self.title_edit)
        
        button_layout = QHBoxLayout()
        self.ok_button = QPushButton("확인")
        self.cancel_button = QPushButton("취소")
        button_layout.addWidget(self.ok_button)
        button_layout.addWidget(self.cancel_button)
        layout.addLayout(button_layout)
        
        self.ok_button.clicked.connect(self.accept)
        self.cancel_button.clicked.connect(self.reject)
        
        if record is not None:
            self.company_edit.setText(record.get("company", ""))
            self.name_edit.setText(record.get("name", ""))
            self.title_edit.setText(record.get("title", ""))
    
    def get_record(self):
        return {
            "company": self.company_edit.text().strip(),
            "name": self.name_edit.text().strip(),
            "title": self.title_edit.text().strip()
        }

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("명찰 출력 프로그램")
        self.resize(1000, 800)

        # A4 용지 크기
        self.A4_WIDTH_PX = 1190
        self.A4_HEIGHT_PX = 1684

        # 명찰 실물 사이즈 (cm)
        badge_width_cm = 9
        badge_height_cm = 12
        px_per_cm = 144 / 2.54
        self.badge_width_px = badge_width_cm * px_per_cm
        self.badge_height_px = badge_height_cm * px_per_cm
        self.badge_left = (self.A4_WIDTH_PX - self.badge_width_px) / 2
        self.badge_top = (self.A4_HEIGHT_PX - self.badge_height_px) / 2

        # 기본 폰트
        self.custom_font_family = "Pretendard SemiBold"

        self.print_text_only = False
        self.group_mode = False
        self.group_item = None

        # 초기 명단
        self.records = []
        self.current_index = 0

        # Scene 및 A4 컨테이너 (배경은 흰색)
        self.scene = QGraphicsScene()
        self.scene.setSceneRect(0, 0, self.A4_WIDTH_PX, self.A4_HEIGHT_PX)
        self.container_item = self.scene.addRect(
            0, 0, self.A4_WIDTH_PX, self.A4_HEIGHT_PX,
            QPen(QColor("blue"), 3), QColor("white"))
        self.container_item.setFlag(self.container_item.ItemIsMovable, False)
        self.container_item.setFlag(self.container_item.ItemIsSelectable, False)

        # 텍스트 아이템들
        self.company_text = CenteredTextItem("", font_size=20)
        self.company_text.setParentItem(self.container_item)
        self.set_centered_pos(
            self.company_text, 
            self.badge_center_x(), 
            self.badge_center_y(0.30)
        )
        self.name_text = CenteredTextItem("", font_size=24)
        self.name_text.setParentItem(self.container_item)
        self.set_centered_pos(
            self.name_text, 
            self.badge_center_x(), 
            self.badge_center_y(0.50)
        )
        self.title_text = CenteredTextItem("", font_size=20)
        self.title_text.setParentItem(self.container_item)
        self.set_centered_pos(
            self.title_text, 
            self.badge_center_x(), 
            self.badge_center_y(0.75)
        )
        for item in [self.company_text, self.name_text, self.title_text]:
            font = item.font()
            font.setFamily(self.custom_font_family)
            item.setFont(font)
        # --- 텍스트박스 드래그 이동 시 우측 좌표 UI 동기화 시그널 연결 ---
        self.company_text.positionChanged.connect(self.sync_company_pos)
        self.name_text.positionChanged.connect(self.sync_name_pos)
        self.title_text.positionChanged.connect(self.sync_title_pos)

        # View 생성
        self.view = QGraphicsView(self.scene)
        self.view.setFixedSize(int(self.A4_WIDTH_PX), int(self.A4_HEIGHT_PX))  # 씬과 동일하게 고정
        self.view.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.view.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.view.setFrameShape(QGraphicsView.NoFrame)
        self.view.setAlignment(Qt.AlignLeft | Qt.AlignTop)
        self.setCentralWidget(self.view)
        self.image_item = None

        # 메인 도구막대
        self.main_toolbar = QToolBar("메인 메뉴")
        self.addToolBar(Qt.TopToolBarArea, self.main_toolbar)
        
        load_excel_action = QAction("엑셀 불러오기", self)
        load_excel_action.triggered.connect(self.load_excel_data)
        self.main_toolbar.addAction(load_excel_action)
        
        load_font_action = QAction("폰트 불러오기", self)
        load_font_action.triggered.connect(self.select_system_font)
        self.main_toolbar.addAction(load_font_action)
        
        load_image_action = QAction("이미지 불러오기", self)
        load_image_action.triggered.connect(self.load_image)
        self.main_toolbar.addAction(load_image_action)
        
        self.text_only_checkbox = QCheckBox("텍스트만 출력")
        self.text_only_checkbox.setChecked(False)
        self.text_only_checkbox.stateChanged.connect(
            lambda state: setattr(self, 'print_text_only', state == Qt.Checked))
        self.main_toolbar.addWidget(self.text_only_checkbox)
        
        self.group_checkbox = QCheckBox("그룹 이동")
        self.group_checkbox.setChecked(False)
        self.group_checkbox.stateChanged.connect(
            lambda state: self.update_grouping(state == Qt.Checked))
        self.main_toolbar.addWidget(self.group_checkbox)
        
        group_center_action = QAction("그룹 좌우 중앙 & 상단 정렬", self)
        group_center_action.triggered.connect(self.center_group)
        self.main_toolbar.addAction(group_center_action)
        
        preview_action = QAction("미리보기", self)
        preview_action.triggered.connect(self.preview)
        self.main_toolbar.addAction(preview_action)
        
        print_action = QAction("프린트", self)
        print_action.triggered.connect(self.print_)
        self.main_toolbar.addAction(print_action)
        
        export_settings_action = QAction("설정 내보내기", self)
        export_settings_action.triggered.connect(self.export_settings)
        self.main_toolbar.addAction(export_settings_action)
        
        import_settings_action = QAction("설정 불러오기", self)
        import_settings_action.triggered.connect(self.import_settings)
        self.main_toolbar.addAction(import_settings_action)
        
        add_record_action = QAction("명단 추가", self)
        add_record_action.triggered.connect(self.add_record)
        self.main_toolbar.addAction(add_record_action)
        
        edit_record_action = QAction("명단 수정", self)
        edit_record_action.triggered.connect(self.edit_record)
        self.main_toolbar.addAction(edit_record_action)

        # 명단 관련 위젯 (Dock)
        self.list_widget = QListWidget()
        self.list_widget.currentRowChanged.connect(self.on_list_currentRowChanged)
        self.select_all_checkbox = QCheckBox("전체 선택")
        self.select_all_checkbox.stateChanged.connect(self.select_all_items)
        list_container = QWidget()
        list_layout = QVBoxLayout()
        list_container.setLayout(list_layout)
        list_layout.addWidget(self.select_all_checkbox)
        list_layout.addWidget(self.list_widget)
        self.list_dock = QDockWidget("명단", self)
        self.list_dock.setAllowedAreas(Qt.LeftDockWidgetArea | Qt.RightDockWidgetArea)
        self.list_dock.setWidget(list_container)
        self.addDockWidget(Qt.LeftDockWidgetArea, self.list_dock)

        # --- 텍스트 위치 조정 슬라이더 + 입력창 추가 ---
        self.slider_group = QGroupBox("텍스트 위치 조정")
        slider_layout = QFormLayout()
        # 회사명 X
        self.company_x_slider = QSlider(Qt.Horizontal)
        self.company_x_slider.setRange(0, int(self.A4_WIDTH_PX))
        self.company_x_slider.setValue(int(self.company_text.pos().x()))
        self.company_x_edit = QLineEdit(str(int(self.company_text.pos().x())))
        self.company_x_edit.setFixedWidth(60)
        def update_company_x_from_slider(v):
            self.company_text.setPos(v, self.company_text.pos().y())
            self.company_x_edit.setText(str(v))
        self.company_x_slider.valueChanged.connect(update_company_x_from_slider)
        def update_company_x_from_edit():
            try:
                v = int(self.company_x_edit.text())
                self.company_x_slider.setValue(v)
            except ValueError:
                pass
        self.company_x_edit.editingFinished.connect(update_company_x_from_edit)
        row_widget = QWidget()
        row_layout = QHBoxLayout()
        row_layout.setContentsMargins(0, 0, 0, 0)
        row_widget.setLayout(row_layout)
        row_layout.addWidget(self.company_x_slider)
        row_layout.addWidget(self.company_x_edit)
        slider_layout.addRow(QLabel("회사명 X"), row_widget)
        # 회사명 Y
        self.company_y_slider = QSlider(Qt.Horizontal)
        self.company_y_slider.setRange(0, int(self.A4_HEIGHT_PX))
        self.company_y_slider.setValue(int(self.company_text.pos().y()))
        self.company_y_edit = QLineEdit(str(int(self.company_text.pos().y())))
        self.company_y_edit.setFixedWidth(60)
        def update_company_y_from_slider(v):
            self.company_text.setPos(self.company_text.pos().x(), v)
            self.company_y_edit.setText(str(v))
        self.company_y_slider.valueChanged.connect(update_company_y_from_slider)
        def update_company_y_from_edit():
            try:
                v = int(self.company_y_edit.text())
                self.company_y_slider.setValue(v)
            except ValueError:
                pass
        self.company_y_edit.editingFinished.connect(update_company_y_from_edit)
        row_widget_y = QWidget()
        row_layout_y = QHBoxLayout()
        row_layout_y.setContentsMargins(0, 0, 0, 0)
        row_widget_y.setLayout(row_layout_y)
        row_layout_y.addWidget(self.company_y_slider)
        row_layout_y.addWidget(self.company_y_edit)
        slider_layout.addRow(QLabel("회사명 Y"), row_widget_y)
        # 이름 X
        self.name_x_slider = QSlider(Qt.Horizontal)
        self.name_x_slider.setRange(0, int(self.A4_WIDTH_PX))
        self.name_x_slider.setValue(int(self.name_text.pos().x()))
        self.name_x_edit = QLineEdit(str(int(self.name_text.pos().x())))
        self.name_x_edit.setFixedWidth(60)
        def update_name_x_from_slider(v):
            self.name_text.setPos(v, self.name_text.pos().y())
            self.name_x_edit.setText(str(v))
        self.name_x_slider.valueChanged.connect(update_name_x_from_slider)
        def update_name_x_from_edit():
            try:
                v = int(self.name_x_edit.text())
                self.name_x_slider.setValue(v)
            except ValueError:
                pass
        self.name_x_edit.editingFinished.connect(update_name_x_from_edit)
        row_widget_nx = QWidget()
        row_layout_nx = QHBoxLayout()
        row_layout_nx.setContentsMargins(0, 0, 0, 0)
        row_widget_nx.setLayout(row_layout_nx)
        row_layout_nx.addWidget(self.name_x_slider)
        row_layout_nx.addWidget(self.name_x_edit)
        slider_layout.addRow(QLabel("이름 X"), row_widget_nx)
        # 이름 Y
        self.name_y_slider = QSlider(Qt.Horizontal)
        self.name_y_slider.setRange(0, int(self.A4_HEIGHT_PX))
        self.name_y_slider.setValue(int(self.name_text.pos().y()))
        self.name_y_edit = QLineEdit(str(int(self.name_text.pos().y())))
        self.name_y_edit.setFixedWidth(60)
        def update_name_y_from_slider(v):
            self.name_text.setPos(self.name_text.pos().x(), v)
            self.name_y_edit.setText(str(v))
        self.name_y_slider.valueChanged.connect(update_name_y_from_slider)
        def update_name_y_from_edit():
            try:
                v = int(self.name_y_edit.text())
                self.name_y_slider.setValue(v)
            except ValueError:
                pass
        self.name_y_edit.editingFinished.connect(update_name_y_from_edit)
        row_widget_ny = QWidget()
        row_layout_ny = QHBoxLayout()
        row_layout_ny.setContentsMargins(0, 0, 0, 0)
        row_widget_ny.setLayout(row_layout_ny)
        row_layout_ny.addWidget(self.name_y_slider)
        row_layout_ny.addWidget(self.name_y_edit)
        slider_layout.addRow(QLabel("이름 Y"), row_widget_ny)
        # 직급 X
        self.title_x_slider = QSlider(Qt.Horizontal)
        self.title_x_slider.setRange(0, int(self.A4_WIDTH_PX))
        self.title_x_slider.setValue(int(self.title_text.pos().x()))
        self.title_x_edit = QLineEdit(str(int(self.title_text.pos().x())))
        self.title_x_edit.setFixedWidth(60)
        def update_title_x_from_slider(v):
            self.title_text.setPos(v, self.title_text.pos().y())
            self.title_x_edit.setText(str(v))
        self.title_x_slider.valueChanged.connect(update_title_x_from_slider)
        def update_title_x_from_edit():
            try:
                v = int(self.title_x_edit.text())
                self.title_x_slider.setValue(v)
            except ValueError:
                pass
        self.title_x_edit.editingFinished.connect(update_title_x_from_edit)
        row_widget_tx = QWidget()
        row_layout_tx = QHBoxLayout()
        row_layout_tx.setContentsMargins(0, 0, 0, 0)
        row_widget_tx.setLayout(row_layout_tx)
        row_layout_tx.addWidget(self.title_x_slider)
        row_layout_tx.addWidget(self.title_x_edit)
        slider_layout.addRow(QLabel("직급 X"), row_widget_tx)
        # 직급 Y
        self.title_y_slider = QSlider(Qt.Horizontal)
        self.title_y_slider.setRange(0, int(self.A4_HEIGHT_PX))
        self.title_y_slider.setValue(int(self.title_text.pos().y()))
        self.title_y_edit = QLineEdit(str(int(self.title_text.pos().y())))
        self.title_y_edit.setFixedWidth(60)
        def update_title_y_from_slider(v):
            self.title_text.setPos(self.title_text.pos().x(), v)
            self.title_y_edit.setText(str(v))
        self.title_y_slider.valueChanged.connect(update_title_y_from_slider)
        def update_title_y_from_edit():
            try:
                v = int(self.title_y_edit.text())
                self.title_y_slider.setValue(v)
            except ValueError:
                pass
        self.title_y_edit.editingFinished.connect(update_title_y_from_edit)
        row_widget_ty = QWidget()
        row_layout_ty = QHBoxLayout()
        row_layout_ty.setContentsMargins(0, 0, 0, 0)
        row_widget_ty.setLayout(row_layout_ty)
        row_layout_ty.addWidget(self.title_y_slider)
        row_layout_ty.addWidget(self.title_y_edit)
        slider_layout.addRow(QLabel("직급 Y"), row_widget_ty)
        self.slider_group.setLayout(slider_layout)
        self.slider_dock = QDockWidget("텍스트 위치", self)
        self.slider_dock.setWidget(self.slider_group)
        self.addDockWidget(Qt.RightDockWidgetArea, self.slider_dock)

    def badge_center_x(self):
        """명찰의 X축 중심 좌표를 반환합니다."""
        return self.badge_left + self.badge_width_px / 2

    def badge_center_y(self, ratio):
        """명찰의 Y축 중심 좌표를 반환합니다."""
        return self.badge_top + self.badge_height_px * ratio

    def set_centered_pos(self, item, center_x, center_y):
        """아이템을 지정된 중심 좌표에 배치합니다."""
        br = item.boundingRect()
        item.setPos(
            center_x - br.center().x(),
            center_y - br.center().y()
        )

    def update_name_tag(self):
        if self.records and 0 <= self.current_index < len(self.records):
            record = self.records[self.current_index]
            # 텍스트만 변경 (위치는 건드리지 않음)
            self.company_text.setPlainText(record["company"])
            self.name_text.setPlainText(record["name"])
            self.title_text.setPlainText(record["title"])

    def load_excel_data(self):
        fileName, _ = QFileDialog.getOpenFileName(
            self, "엑셀 파일 선택", "", 
            "Excel Files (*.xlsx *.xls)")
        if fileName:
            try:
                df = pd.read_excel(fileName)
                df.columns = df.columns.str.strip()  # 컬럼명 앞뒤 공백 제거
            except Exception as e:
                QMessageBox.critical(
                    self, "오류", 
                    f"엑셀 파일 읽기 오류:\n{str(e)}")
                return
            required_cols = ["이름", "회사명", "직급"]
            for col in required_cols:
                if col not in df.columns:
                    QMessageBox.critical(
                        self, "오류", 
                        f"엑셀 파일에 '{col}' 컬럼이 없습니다.")
                    return
            self.records = []
            self.list_widget.clear()
            for idx, row in df.iterrows():
                name = str(row["이름"]).strip()
                if name == "" or name.lower() == "nan":
                    continue
                record = {
                    "name": name,
                    "company": str(row["회사명"]).strip(),
                    "title": str(row["직급"]).strip()
                }
                self.records.append(record)
                item_text = f"{record['company']} - {record['name']}"
                item = QListWidgetItem(item_text)
                item.setFlags(item.flags() | Qt.ItemIsUserCheckable)
                item.setCheckState(Qt.Checked)
                self.list_widget.addItem(item)
            if self.records:
                self.current_index = 0
                self.update_name_tag()

    def on_list_currentRowChanged(self, row):
        if 0 <= row < len(self.records):
            self.current_index = row
            self.update_name_tag()

    def add_record(self):
        dialog = RecordDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            new_record = dialog.get_record()
            if new_record["name"] == "":
                QMessageBox.warning(
                    self, "입력 오류", 
                    "이름은 필수 입력 항목입니다.")
                return
            self.records.append(new_record)
            item_text = f"{new_record['company']} - {new_record['name']}"
            item = QListWidgetItem(item_text)
            item.setFlags(item.flags() | Qt.ItemIsUserCheckable)
            item.setCheckState(Qt.Checked)
            self.list_widget.addItem(item)
            self.list_widget.setCurrentRow(len(self.records) - 1)

    def edit_record(self):
        current_row = self.list_widget.currentRow()
        if current_row < 0 or current_row >= len(self.records):
            QMessageBox.warning(
                self, "오류", 
                "수정할 명단 항목을 선택해주세요.")
            return
        record = self.records[current_row]
        dialog = RecordDialog(self, record)
        if dialog.exec_() == QDialog.Accepted:
            updated_record = dialog.get_record()
            if updated_record["name"] == "":
                QMessageBox.warning(
                    self, "입력 오류", 
                    "이름은 필수 입력 항목입니다.")
                return
            self.records[current_row] = updated_record
            item_text = f"{updated_record['company']} - {updated_record['name']}"
            self.list_widget.item(current_row).setText(item_text)
            self.update_name_tag()

    def select_all_items(self, state):
        count = self.list_widget.count()
        for i in range(count):
            item = self.list_widget.item(i)
            if state == Qt.Checked:
                item.setCheckState(Qt.Checked)
            else:
                item.setCheckState(Qt.Unchecked)

    def update_grouping(self, enabled):
        self.group_mode = enabled
        if self.group_mode:
            items_to_group = [self.company_text, self.name_text, self.title_text]
            if self.image_item is not None:
                items_to_group.append(self.image_item)
            if self.group_item is not None:
                self.scene.destroyItemGroup(self.group_item)
            self.group_item = self.scene.createItemGroup(items_to_group)
            self.group_item.setParentItem(self.container_item)
            self.group_item.setFlags(
                QGraphicsItemGroup.ItemIsMovable | 
                QGraphicsItemGroup.ItemIsSelectable)
        else:
            if self.group_item is not None:
                items = self.scene.destroyItemGroup(self.group_item)
                if items is not None:
                    for item in items:
                        item.setParentItem(self.container_item)
                self.group_item = None

    def center_group(self):
        if self.group_mode and self.group_item is not None:
            group_scene_rect = self.group_item.mapToScene(
                self.group_item.boundingRect()).boundingRect()
            container_rect = self.container_item.rect()
            delta_x = container_rect.center().x() - group_scene_rect.center().x()
            delta_y = container_rect.top() - group_scene_rect.top()
            self.group_item.moveBy(delta_x, delta_y)

    def select_system_font(self):
        dialog = FontSelectionDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            chosen_font = dialog.selected_font()
            if chosen_font:
                self.custom_font_family = chosen_font
                QMessageBox.information(
                    self, "폰트 적용", 
                    f"선택한 폰트: {self.custom_font_family}")
                for item in [self.company_text, self.name_text, self.title_text]:
                    font = item.font()
                    font.setFamily(self.custom_font_family)
                    item.setFont(font)

    def load_image(self):
        fileName, _ = QFileDialog.getOpenFileName(
            self, "이미지 파일 선택", "", 
            "Images (*.png *.jpg *.jpeg *.bmp)")
        if fileName:
            pixmap = QPixmap(fileName)
            if self.image_item:
                self.container_item.removeChildItem(self.image_item)
            self.image_item = DraggablePixmapItem(pixmap)
            self.image_item.setParentItem(self.container_item)
            self.image_item.setZValue(-1)
            scene_center_x = self.A4_WIDTH_PX / 2
            scene_center_y = self.A4_HEIGHT_PX / 2
            img_width = pixmap.width()
            img_height = pixmap.height()
            x = scene_center_x - (img_width / 2)
            y = scene_center_y - (img_height / 2)
            self.image_item.setPos(x, y)
            if self.group_mode:
                self.update_grouping(True)

    def preview(self):
        printer = QPrinter(QPrinter.HighResolution)
        printer.setFullPage(True)
        printer.setPageSize(QPrinter.A4)
        printer.setOrientation(QPrinter.Portrait)
        printer.setPageMargins(0, 0, 0, 0, QPrinter.Millimeter)
        printer.setResolution(144)
        preview_dialog = QPrintPreviewDialog(printer, self)
        preview_dialog.paintRequested.connect(
            lambda p: self.handle_paint_request(p))
        preview_dialog.exec_()

    def handle_paint_request(self, printer):
        text_visible = True
        company_visible = self.company_text.isVisible()
        name_visible = self.name_text.isVisible()
        title_visible = self.title_text.isVisible()
        self.company_text.setVisible(text_visible)
        self.name_text.setVisible(text_visible)
        self.title_text.setVisible(text_visible)

        image_visible = None
        if self.image_item is not None:
            image_visible = self.image_item.isVisible()
            if self.print_text_only:
                self.image_item.setVisible(False)

        printer.setFullPage(True)
        printer.setResolution(144)
        painter = QPainter(printer)
        page_rect = printer.pageRect()
        painter.save()
        self.scene.render(painter, target=QRectF(page_rect), 
                         source=self.scene.sceneRect())
        painter.restore()
        painter.end()

        self.company_text.setVisible(company_visible)
        self.name_text.setVisible(name_visible)
        self.title_text.setVisible(title_visible)
        if self.image_item is not None and image_visible is not None:
            self.image_item.setVisible(image_visible)

    def print_(self):
        printer = QPrinter(QPrinter.HighResolution)
        printer.setFullPage(True)
        printer.setPageSize(QPrinter.A4)
        printer.setOrientation(QPrinter.Portrait)
        printer.setPageMargins(0, 0, 0, 0, QPrinter.Millimeter)
        printer.setResolution(144)
        dialog = QPrintDialog(printer, self)
        if dialog.exec_() == QPrintDialog.Accepted:
            checked_indices = []
            for i in range(self.list_widget.count()):
                item = self.list_widget.item(i)
                if item.checkState() == Qt.Checked:
                    checked_indices.append(i)
            if checked_indices:
                records_to_print = checked_indices
            else:
                records_to_print = [None]

            painter = QPainter(printer)
            for idx, record_index in enumerate(records_to_print):
                if record_index is not None:
                    self.current_index = record_index
                    self.update_name_tag()
                page_rect = printer.pageRect()
                painter.save()
                self.scene.render(painter, target=QRectF(page_rect), source=self.scene.sceneRect())
                painter.restore()
                if idx != len(records_to_print) - 1:
                    printer.newPage()
            painter.end()

    def export_settings(self):
        options = QFileDialog.Options()
        fileName, _ = QFileDialog.getSaveFileName(
            self, "설정 내보내기", "", 
            "HTML Files (*.html);;All Files (*)", options=options)
        if fileName:
            def get_info(item):
                font = item.font()
                return {
                    "x": float(item.pos().x()),
                    "y": float(item.pos().y()),
                    "text": item.toPlainText(),
                    "font_size": font.pointSize(),
                    "font_family": font.family(),
                    "font_bold": font.bold()
                }
            settings = {
                "company_text": get_info(self.company_text),
                "name_text": get_info(self.name_text),
                "title_text": get_info(self.title_text)
            }
            try:
                with open(fileName, "w", encoding="utf-8") as f:
                    f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
                    f.write('<!DOCTYPE html>\n')
                    f.write('<html>\n<head>\n')
                    f.write('<meta charset="UTF-8">\n')
                    f.write('<title>명찰 설정</title>\n')
                    f.write('</head>\n<body>\n')
                    f.write('<map name="namecard">\n')
                    for key, info in settings.items():
                        f.write(f'  <area role="{key}" alt="{info["text"]}"\n')
                        f.write(f'    title="{info["text"]}" href=""\n')
                        f.write(f'    data-x="{info["x"]}" data-y="{info["y"]}"\n')
                        f.write(f'    data-font-size="{info["font_size"]}" data-font-family="{info["font_family"]}" data-font-bold="{str(info["font_bold"]).lower()}"\n')
                        f.write('    shape="rect" />\n')
                    f.write('</map>\n')
                    f.write('</body>\n</html>')
                QMessageBox.information(
                    self, "설정 내보내기", 
                    "설정이 성공적으로 이미지맵 형식으로 내보내졌습니다.")
            except Exception as e:
                QMessageBox.critical(
                    self, "오류", 
                    f"설정 내보내기 오류:\n{str(e)}")

    def import_settings(self):
        options = QFileDialog.Options()
        fileName, _ = QFileDialog.getOpenFileName(
            self, "설정 불러오기", "", 
            "HTML Files (*.html);;All Files (*)", options=options)
        if fileName:
            try:
                from bs4 import BeautifulSoup
                with open(fileName, "r", encoding="utf-8") as f:
                    soup = BeautifulSoup(f, "html.parser")
                for area in soup.find_all("area"):
                    role = area.get('role')
                    text = area.get('title')
                    x = area.get('data-x')
                    y = area.get('data-y')
                    font_size = area.get('data-font-size')
                    font_family = area.get('data-font-family')
                    font_bold = area.get('data-font-bold')
                    if role == "company_text":
                        item = self.company_text
                        self.company_x_slider.setValue(int(float(x)))
                        self.company_y_slider.setValue(int(float(y)))
                    elif role == "name_text":
                        item = self.name_text
                        self.name_x_slider.setValue(int(float(x)))
                        self.name_y_slider.setValue(int(float(y)))
                    elif role == "title_text":
                        item = self.title_text
                        self.title_x_slider.setValue(int(float(x)))
                        self.title_y_slider.setValue(int(float(y)))
                    else:
                        continue
                    item.setParentItem(self.container_item)
                    item.setPlainText(text)
                    font = item.font()
                    if font_size:
                        font.setPointSize(int(font_size))
                    if font_family:
                        font.setFamily(font_family)
                    if font_bold:
                        font.setBold(font_bold == 'true')
                    item.setFont(font)
                    item.setPos(float(x), float(y))
                QMessageBox.information(
                    self, "설정 불러오기", 
                    "설정이 성공적으로 불러와졌습니다.")
            except Exception as e:
                QMessageBox.critical(
                    self, "오류", 
                    f"설정 불러오기 오류:\n{str(e)}")

    # --- 텍스트박스 드래그 이동 시 우측 좌표 UI 동기화 함수 ---
    def sync_company_pos(self, x, y):
        self.company_x_slider.blockSignals(True)
        self.company_y_slider.blockSignals(True)
        self.company_x_edit.blockSignals(True)
        self.company_y_edit.blockSignals(True)
        self.company_x_slider.setValue(int(x))
        self.company_y_slider.setValue(int(y))
        self.company_x_edit.setText(str(int(x)))
        self.company_y_edit.setText(str(int(y)))
        self.company_x_slider.blockSignals(False)
        self.company_y_slider.blockSignals(False)
        self.company_x_edit.blockSignals(False)
        self.company_y_edit.blockSignals(False)
    def sync_name_pos(self, x, y):
        self.name_x_slider.blockSignals(True)
        self.name_y_slider.blockSignals(True)
        self.name_x_edit.blockSignals(True)
        self.name_y_edit.blockSignals(True)
        self.name_x_slider.setValue(int(x))
        self.name_y_slider.setValue(int(y))
        self.name_x_edit.setText(str(int(x)))
        self.name_y_edit.setText(str(int(y)))
        self.name_x_slider.blockSignals(False)
        self.name_y_slider.blockSignals(False)
        self.name_x_edit.blockSignals(False)
        self.name_y_edit.blockSignals(False)
    def sync_title_pos(self, x, y):
        self.title_x_slider.blockSignals(True)
        self.title_y_slider.blockSignals(True)
        self.title_x_edit.blockSignals(True)
        self.title_y_edit.blockSignals(True)
        self.title_x_slider.setValue(int(x))
        self.title_y_slider.setValue(int(y))
        self.title_x_edit.setText(str(int(x)))
        self.title_y_edit.setText(str(int(y)))
        self.title_x_slider.blockSignals(False)
        self.title_y_slider.blockSignals(False)
        self.title_x_edit.blockSignals(False)
        self.title_y_edit.blockSignals(False)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)
    mainWin = MainWindow()
    mainWin.show()
    sys.exit(app.exec_()) 