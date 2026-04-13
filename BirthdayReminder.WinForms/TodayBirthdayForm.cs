using System.Windows.Forms;
using System.Collections.Generic;
using System.Linq;

namespace BirthdayReminder
{
    public partial class TodayBirthdayForm : Form
    {
        private System.ComponentModel.IContainer components = null;
        
        public TodayBirthdayForm(List<BirthdayEntry> birthdays)
        {
            InitializeComponent();
            
            lblTitle.Text = $"今日生日 ({birthdays.Count} 人)";
            
            var displayList = birthdays.Select(b => new
            {
                b.Name,
                b.PhoneNumber,
                b.Birthday,
                b.Remarks
            }).ToList();
            
            dataGridView1.DataSource = displayList;
            
            if (dataGridView1.Columns.Count > 0)
            {
                dataGridView1.Columns["Name"].HeaderText = "姓名";
                dataGridView1.Columns["PhoneNumber"].HeaderText = "手机号";
                dataGridView1.Columns["Birthday"].HeaderText = "生日";
                dataGridView1.Columns["Remarks"].HeaderText = "备注";
            }
            
            if (birthdays.Count == 0)
            {
                MessageBox.Show("今天没有人过生日", "提示", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
        
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
            this.lblTitle = new System.Windows.Forms.Label();
            this.dataGridView1 = new System.Windows.Forms.DataGridView();
            this.btnClose = new System.Windows.Forms.Button();
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).BeginInit();
            this.SuspendLayout();
            // 
            // lblTitle
            // 
            this.lblTitle.AutoSize = true;
            this.lblTitle.Font = new System.Drawing.Font("Microsoft YaHei", 14F, System.Drawing.FontStyle.Bold);
            this.lblTitle.ForeColor = System.Drawing.Color.FromArgb(233, 30, 98);
            this.lblTitle.Location = new System.Drawing.Point(20, 20);
            this.lblTitle.Name = "lblTitle";
            this.lblTitle.Size = new System.Drawing.Size(100, 26);
            this.lblTitle.TabIndex = 0;
            this.lblTitle.Text = "今日生日";
            // 
            // dataGridView1
            // 
            this.dataGridView1.AllowUserToAddRows = false;
            this.dataGridView1.AllowUserToDeleteRows = false;
            this.dataGridView1.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            this.dataGridView1.Dock = System.Windows.Forms.DockStyle.Top;
            this.dataGridView1.Location = new System.Drawing.Point(0, 60);
            this.dataGridView1.Name = "dataGridView1";
            this.dataGridView1.ReadOnly = true;
            this.dataGridView1.RowTemplate.Height = 25;
            this.dataGridView1.SelectionMode = System.Windows.Forms.DataGridViewSelectionMode.FullRowSelect;
            this.dataGridView1.Size = new System.Drawing.Size(450, 250);
            this.dataGridView1.TabIndex = 1;
            // 
            // btnClose
            // 
            this.btnClose.Location = new System.Drawing.Point(175, 320);
            this.btnClose.Name = "btnClose";
            this.btnClose.Size = new System.Drawing.Size(100, 30);
            this.btnClose.TabIndex = 2;
            this.btnClose.Text = "关闭";
            this.btnClose.UseVisualStyleBackColor = true;
            this.btnClose.Click += new System.EventHandler(this.btnClose_Click);
            // 
            // TodayBirthdayForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(7F, 15F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(450, 370);
            this.Controls.Add(this.btnClose);
            this.Controls.Add(this.dataGridView1);
            this.Controls.Add(this.lblTitle);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.Name = "TodayBirthdayForm";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterParent;
            this.Text = "今日生日";
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).EndInit();
            this.ResumeLayout(false);
            this.PerformLayout();
        }
        
        private System.Windows.Forms.Label lblTitle;
        private System.Windows.Forms.DataGridView dataGridView1;
        private System.Windows.Forms.Button btnClose;
        
        private void btnClose_Click(object sender, EventArgs e)
        {
            this.Close();
        }
    }
}