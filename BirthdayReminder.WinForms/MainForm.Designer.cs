using System.Drawing;
using System.Windows.Forms;

namespace BirthdayReminder
{
    partial class MainForm
    {
        private System.ComponentModel.IContainer components = null;
        
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }
        
        private void InitializeComponent()
        {
            this.dataGridView1 = new DataGridView();
            this.btnAdd = new Button();
            this.btnEdit = new Button();
            this.btnDelete = new Button();
            this.btnRefresh = new Button();
            this.btnTodayBirthdays = new Button();
            this.label1 = new Label();
            this.menuStrip1 = new MenuStrip();
            
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).BeginInit();
            this.SuspendLayout();
            // 
            // label1 - Title
            // 
            this.label1.Font = new Font("Microsoft YaHei", 14F, FontStyle.Bold);
            this.label1.Location = new Point(20, 15);
            this.label1.AutoSize = true;
            this.label1.Text = "生日提醒";
            this.label1.ForeColor = Color.FromArgb(24, 144, 255);
            // 
            // Toolbar Panel
            var toolbar = new FlowLayoutPanel
            {
                Location = new Point(15, 50),
                Size = new Size(770, 40),
                FlowDirection = FlowDirection.LeftToRight,
                AutoSize = true,
                AutoSizeMode = AutoSizeMode.GrowAndShrink
            };
            
            // btnAdd
            this.btnAdd.Size = new Size(70, 32);
            this.btnAdd.Text = "新增";
            this.btnAdd.FlatStyle = FlatStyle.Flat;
            this.btnAdd.BackColor = Color.FromArgb(24, 144, 255);
            this.btnAdd.ForeColor = Color.White;
            this.btnAdd.Click += new System.EventHandler(this.btnAdd_Click);
            
            // btnEdit
            this.btnEdit.Size = new Size(70, 32);
            this.btnEdit.Text = "编辑";
            this.btnEdit.FlatStyle = FlatStyle.Flat;
            this.btnEdit.Click += new System.EventHandler(this.btnEdit_Click);
            
            // btnDelete
            this.btnDelete.Size = new Size(70, 32);
            this.btnDelete.Text = "删除";
            this.btnDelete.FlatStyle = FlatStyle.Flat;
            this.btnDelete.BackColor = Color.FromArgb(255, 77, 89);
            this.btnDelete.ForeColor = Color.White;
            this.btnDelete.Click += new System.EventHandler(this.btnDelete_Click);
            
            // btnRefresh
            this.btnRefresh.Size = new Size(70, 32);
            this.btnRefresh.Text = "刷新";
            this.btnRefresh.FlatStyle = FlatStyle.Flat;
            this.btnRefresh.Click += new System.EventHandler(this.btnRefresh_Click);
            
            // btnTodayBirthdays
            this.btnTodayBirthdays.Size = new Size(90, 32);
            this.btnTodayBirthdays.Text = "今日生日";
            this.btnTodayBirthdays.FlatStyle = FlatStyle.Flat;
            this.btnTodayBirthdays.BackColor = Color.FromArgb(255, 240, 245);
            this.btnTodayBirthdays.ForeColor = Color.FromArgb(255, 77, 89);
            this.btnTodayBirthdays.Click += new System.EventHandler(this.btnTodayBirthdays_Click);
            
            toolbar.Controls.Add(this.btnAdd);
            toolbar.Controls.Add(this.btnEdit);
            toolbar.Controls.Add(this.btnDelete);
            toolbar.Controls.Add(this.btnRefresh);
            toolbar.Controls.Add(this.btnTodayBirthdays);
            
            // menuStrip1 - Menu
            this.menuStrip1.Location = new Point(600, 12);
            this.menuStrip1.Dock = DockStyle.None;
            
            var fileMenu = new ToolStripMenuItem("文件");
            var importItem = new ToolStripMenuItem("导入Excel");
            importItem.Click += (s, e) => ImportExcel();
            var exportItem = new ToolStripMenuItem("导出Excel");
            exportItem.Click += (s, e) => ExportExcel();
            fileMenu.DropDownItems.Add(importItem);
            fileMenu.DropDownItems.Add(exportItem);
            fileMenu.DropDownItems.Add(new ToolStripSeparator());
            fileMenu.DropDownItems.Add(new ToolStripMenuItem("退出", null, (s, e) => ExitApp()));
            
            var settingsMenu = new ToolStripMenuItem("设置");
            settingsMenu.Click += (s, e) => ShowSettingsForm();
            
            this.menuStrip1.Items.Add(fileMenu);
            this.menuStrip1.Items.Add(settingsMenu);
            
            // dataGridView1
            this.dataGridView1.Location = new Point(15, 100);
            this.dataGridView1.Size = new Size(770, 380);
            this.dataGridView1.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            this.dataGridView1.AllowUserToAddRows = false;
            this.dataGridView1.AllowUserToDeleteRows = false;
            this.dataGridView1.ReadOnly = true;
            this.dataGridView1.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            this.dataGridView1.RowTemplate.Height = 30;
            this.dataGridView1.ColumnHeadersHeight = 30;
            this.dataGridView1.BackgroundColor = Color.White;
            this.dataGridView1.BorderStyle = BorderStyle.None;
            this.dataGridView1.GridColor = Color.FromArgb(240, 240, 240);
            this.dataGridView1.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(250, 250, 250);
            this.dataGridView1.ColumnHeadersDefaultCellStyle.SelectionBackColor = Color.FromArgb(24, 144, 255);
            
            // MainForm
            this.Size = new Size(800, 500);
            this.MinimumSize = new Size(800, 500);
            this.BackColor = Color.FromArgb(250, 250, 250);
            this.Controls.Add(this.menuStrip1);
            this.Controls.Add(this.label1);
            this.Controls.Add(toolbar);
            this.Controls.Add(this.dataGridView1);
            this.Name = "MainForm";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "生日提醒";
            this.FormClosing += new FormClosingEventHandler(this.MainForm_FormClosing);
            this.Load += new EventHandler(this.MainForm_Load);
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).EndInit();
            this.ResumeLayout(false);
        }
        
        private DataGridView dataGridView1;
        private Button btnAdd;
        private Button btnEdit;
        private Button btnDelete;
        private Button btnRefresh;
        private Button btnTodayBirthdays;
        private Label label1;
        private MenuStrip menuStrip1;
    }
}