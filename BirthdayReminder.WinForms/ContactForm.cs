using System.ComponentModel;

namespace BirthdayReminder;

public partial class ContactForm : Form
{
    [DesignerSerializationVisibility(DesignerSerializationVisibility.Visible)]
    public BirthdayEntry Contact { get; private set; }
    
    public ContactForm(BirthdayEntry? contact = null)
    {
        InitializeComponent();
        Contact = contact ?? new BirthdayEntry();
        
        if (contact != null)
        {
            txtName.Text = contact.Name;
            txtPhone.Text = contact.PhoneNumber;
            dtpBirthday.Value = contact.Birthday;
            txtRemarks.Text = contact.Remarks;
            this.Text = "编辑联系人";
            btnSave.Text = "保存";
        }
    }
    
    private void btnSave_Click(object sender, EventArgs e)
    {
        if (string.IsNullOrWhiteSpace(txtName.Text))
        {
            MessageBox.Show("请输入姓名", "提示", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        
        Contact.Name = txtName.Text.Trim();
        Contact.PhoneNumber = string.IsNullOrWhiteSpace(txtPhone.Text) ? null : txtPhone.Text.Trim();
        Contact.Birthday = dtpBirthday.Value;
        Contact.Remarks = string.IsNullOrWhiteSpace(txtRemarks.Text) ? null : txtRemarks.Text.Trim();
        
        this.DialogResult = DialogResult.OK;
        this.Close();
    }
    
    private void btnCancel_Click(object sender, EventArgs e)
    {
        this.DialogResult = DialogResult.Cancel;
        this.Close();
    }
}