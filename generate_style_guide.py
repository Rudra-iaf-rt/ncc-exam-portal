from fpdf import FPDF
import os

class NCCStyleGuidePDF(FPDF):
    def __init__(self):
        super().__init__('P', 'mm', 'A4')
        self.set_auto_page_break(auto=True, margin=20)
        
    def header(self):
        if self.page_no() > 1:
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(154, 154, 142)  # ink-4
            self.cell(0, 5, 'NCC Exam Portal -- Style Guide v1.0', align='L')
            self.cell(0, 5, f'Page {self.page_no()}', align='R', new_x="LMARGIN", new_y="NEXT")
            self.line(10, 12, 200, 12)
            self.ln(4)
    
    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(154, 154, 142)
        self.cell(0, 10, 'Unity & Discipline  |  NCC Tirupati Unit', align='C')

    def section_title(self, number, title):
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(28, 28, 24)  # ink
        self.cell(0, 10, f'{number} -- {title}', new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(232, 228, 216)  # stone-mid
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)
    
    def sub_heading(self, text):
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(106, 106, 96)  # ink-3
        self.cell(0, 7, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)
    
    def body_text(self, text):
        self.set_font('Helvetica', '', 9.5)
        self.set_text_color(58, 58, 52)  # ink-2
        self.multi_cell(0, 5, text)
        self.ln(2)
    
    def note_box(self, text, bg_color=(237, 241, 248)):  # navy-wash
        self.set_fill_color(*bg_color)
        self.set_draw_color(74, 96, 144)  # navy-soft
        x = self.get_x()
        y = self.get_y()
        self.set_font('Helvetica', '', 8.5)
        self.set_text_color(58, 58, 52)
        self.rect(x, y, 190, 18, 'DF')
        self.set_xy(x + 3, y + 2)
        self.multi_cell(184, 4.5, text)
        self.ln(4)

    def color_swatch(self, name, hex_val, rgb, role, x, y, w=45, h=22):
        r = int(hex_val[1:3], 16)
        g = int(hex_val[3:5], 16)
        b = int(hex_val[5:7], 16)
        
        self.set_fill_color(r, g, b)
        self.rect(x, y, w, h, 'F')
        self.set_draw_color(204, 200, 188)  # stone-deep
        self.rect(x, y, w, h, 'D')
        
        self.set_xy(x, y + h + 1)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(28, 28, 24)
        self.cell(w, 4, name, align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_font('Helvetica', '', 7)
        self.set_text_color(106, 106, 96)
        self.cell(w, 3.5, role, align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_font('Helvetica', '', 6.5)
        self.set_text_color(154, 154, 142)
        self.cell(w, 3.5, hex_val.upper(), align='C', new_x="LMARGIN", new_y="NEXT")
        self.cell(w, 3.5, f'RGB {rgb}', align='C')

    def color_scale_row(self, colors, labels, x, y, w=36, h=14):
        for i, (color, label) in enumerate(zip(colors, labels)):
            r = int(color[1:3], 16)
            g = int(color[3:5], 16)
            b = int(color[5:7], 16)
            self.set_fill_color(r, g, b)
            self.rect(x + i * (w + 2), y, w, h, 'F')
            self.set_draw_color(204, 200, 188)
            self.rect(x + i * (w + 2), y, w, h, 'D')
            self.set_xy(x + i * (w + 2), y + h + 1)
            self.set_font('Helvetica', '', 6.5)
            self.set_text_color(154, 154, 142)
            self.cell(w, 3.5, label.upper(), align='C')

pdf = NCCStyleGuidePDF()
pdf.add_page()

# ========== COVER / HERO ==========
pdf.set_fill_color(26, 39, 68)  # navy
pdf.rect(0, 0, 210, 85, 'F')

# Gold stripe
pdf.set_fill_color(184, 134, 11)  # gold
pdf.rect(0, 0, 210, 3, 'F')

pdf.set_y(15)
pdf.set_font('Helvetica', '', 8)
pdf.set_text_color(184, 134, 11)  # gold
pdf.cell(0, 5, 'NCC TIRUPATI UNIT . EXAMINATION PORTAL', align='C', new_x="LMARGIN", new_y="NEXT")

pdf.ln(3)
pdf.set_font('Helvetica', 'B', 28)
pdf.set_text_color(244, 240, 228)  # stone
pdf.cell(0, 14, 'Design', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', 'BI', 28)
pdf.set_text_color(240, 220, 130)  # gold-pale
pdf.cell(0, 14, 'Standard', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', 'B', 28)
pdf.set_text_color(244, 240, 228)
pdf.cell(0, 14, '& Style Guide', align='C', new_x="LMARGIN", new_y="NEXT")

pdf.ln(4)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(200, 200, 190)
pdf.set_x(30)
pdf.multi_cell(150, 4.5, 'A disciplined, premium design language drawn from military precision -- commanding clarity, dignified restraint, and earned trust.', align='C')

pdf.ln(6)
# Pills
pills = ['React + Vite', 'TailwindCSS v4', 'Outfit . Cormorant Garamond . DM Mono', 'WCAG AA']
pdf.set_x(25)
for i, pill in enumerate(pills):
    pdf.set_font('Helvetica', '', 7)
    pdf.set_text_color(180, 180, 170)
    pdf.set_draw_color(80, 80, 70)
    x = pdf.get_x()
    y = pdf.get_y()
    w = pdf.get_string_width(pill) + 8
    pdf.rect(x, y, w, 5, 'D')
    pdf.set_xy(x + 2, y + 0.5)
    pdf.cell(w - 4, 4, pill)
    pdf.set_x(x + w + 3)

pdf.ln(20)

# ========== SECTION 1: ICONOGRAPHY ==========
pdf.section_title('01', 'ICONOGRAPHY')

pdf.body_text('Our icons are crisp, clean, minimal, and highly functional graphic elements meant to punctuate, inform, and highlight content. We use Lucide React exclusively -- outline only, never filled. Icons at 16px for inline use, 20px for navigation, 24px max for empty states. Always pair with a text label; never rely on icons alone to convey meaning.')

pdf.ln(2)
# Icon grid representation
icon_names = ['Menu', 'Dashboard', 'User', 'Exam', 'College', 'Results', 'Timer', 'Correct', 'Wrong', 'Export', 'Suspend', 'More']
pdf.set_font('Helvetica', '', 7)
pdf.set_text_color(106, 106, 96)
x_start = 15
y_start = pdf.get_y()
for i, name in enumerate(icon_names):
    col = i % 6
    row = i // 6
    x = x_start + col * 31
    y = y_start + row * 18
    pdf.set_xy(x, y)
    pdf.set_fill_color(253, 252, 248)  # white/parchment
    pdf.set_draw_color(204, 200, 188)
    pdf.rect(x, y, 14, 14, 'DF')
    pdf.set_xy(x, y + 15)
    pdf.cell(30, 3, name, align='C')
pdf.set_y(y_start + 40)

# ========== SECTION 2: COLORS ==========
pdf.section_title('02', 'OUR COLORS')

pdf.body_text('One of the first impressions that comes across with color. Our primary colors are Corps Navy, Field Olive, Ceremonial Gold, and Parade Crimson. These are supplemented by a full neutral scale that allows us to emphasize digital elements as we need to drive hierarchy, yet still keep the brand look and feel balanced.')

pdf.ln(2)
pdf.sub_heading('Primary Color Palette')
pdf.body_text('Use our primary color palette first and frequently throughout our visual system, especially for hero application areas -- such as dashboard covers, examination portals, and landing pages. This approach will help us build equity in our color and make it an identifiable element of our brand.')

# Primary palette
primaries = [
    ('Corps Navy', '#1A2744', '26, 39, 68', 'Primary action, sidebar, headings'),
    ('Field Olive', '#3B3D2A', '59, 61, 42', 'Secondary action, success states'),
    ('Ceremonial Gold', '#B8860B', '184, 134, 11', 'Accent, rank indicators, highlights'),
    ('Parade Crimson', '#8B1A1A', '139, 26, 26', 'Danger, destructive, failed states'),
]
x_start = 15
y_start = pdf.get_y()
for i, (name, hex_val, rgb, role) in enumerate(primaries):
    pdf.color_swatch(name, hex_val, rgb, role, x_start + i * 48, y_start)
pdf.set_y(y_start + 45)

pdf.ln(5)
pdf.sub_heading('Neutral Scale')
pdf.body_text('The neutral scale provides the foundation for all text, backgrounds, and borders. Parade Stone is the page background; Parchment is used for card surfaces and inputs; Ink through Ink-4 create a clear typographic hierarchy.')

neutrals = [
    ('Ink', '#1C1C18', '28, 28, 24', 'Primary text'),
    ('Ink-2', '#3A3A34', '58, 58, 52', 'Body text, descriptions'),
    ('Ink-3', '#6A6A60', '106, 106, 96', 'Secondary text, labels'),
    ('Parade Stone', '#F4F2EC', '244, 242, 236', 'Page background'),
    ('Parchment', '#FDFCF8', '253, 252, 248', 'Card surfaces, inputs'),
]
x_start = 15
y_start = pdf.get_y()
for i, (name, hex_val, rgb, role) in enumerate(neutrals):
    pdf.color_swatch(name, hex_val, rgb, role, x_start + i * 38, y_start)
pdf.set_y(y_start + 45)

pdf.ln(5)
pdf.sub_heading('Navy Scale (5-step ramp)')
navy_colors = ['#EDF1F8', '#B8C8E0', '#4A6090', '#253660', '#1A2744']
navy_labels = ['wash', 'pale', 'soft', 'mid', 'base']
pdf.color_scale_row(navy_colors, navy_labels, 15, pdf.get_y())
pdf.ln(22)

pdf.sub_heading('Olive Scale (5-step ramp)')
olive_colors = ['#EEF0E0', '#C8CC9E', '#8B9063', '#5A5E3E', '#3B3D2A']
olive_labels = ['wash', 'pale', 'soft', 'mid', 'base']
pdf.color_scale_row(olive_colors, olive_labels, 15, pdf.get_y())
pdf.ln(22)

pdf.sub_heading('Gold Scale (5-step ramp)')
gold_colors = ['#FBF5DC', '#F0DC82', '#D4A017', '#B8860B', '#8E6806']
gold_labels = ['wash', 'pale', 'mid', 'base', 'deep']
pdf.color_scale_row(gold_colors, gold_labels, 15, pdf.get_y())
pdf.ln(22)

pdf.sub_heading('Crimson Scale (4-step ramp)')
crimson_colors = ['#FAEAEA', '#C44040', '#8B1A1A', '#631212']
crimson_labels = ['wash', 'soft', 'base', 'deep']
pdf.color_scale_row(crimson_colors, crimson_labels, 15, pdf.get_y())
pdf.ln(22)

pdf.note_box('Rule: Use wash-level fills behind text of the base colour. Navy wash (#EDF1F8) behind navy-mid (#253660) text. Never mix ramps -- e.g., navy fill with olive text. Gold only on accent elements -- never as a background for body text.')

# ========== SECTION 3: COLOR ACCESSIBILITY ==========
pdf.ln(3)
pdf.sub_heading('Color & Accessibility in Digital')
pdf.body_text('Our color palette was designed to meet WCAG 2.1 AA color contrast standards. When combining colors for on-screen text -- such as for buttons, infographics, or tables -- we must ensure all audiences can easily read our content.')

# Contrast table
pdf.set_font('Helvetica', 'B', 8)
pdf.set_text_color(28, 28, 24)
pdf.set_fill_color(26, 39, 68)
pdf.set_text_color(253, 252, 248)
col_w = [35, 31, 31, 31, 31, 31]
headers = ['Text Color', 'Parchment', 'Olive Wash', 'Navy Wash', 'Gold Wash', 'Crimson Wash']
for i, h in enumerate(headers):
    pdf.cell(col_w[i], 6, h, border=1, align='C', fill=True)
pdf.ln()

rows = [
    ('Ink (#1C1C18)', 'AAA', 'AAA', 'AAA', 'AAA', 'AAA'),
    ('Navy (#1A2744)', 'AAA', 'AAA', 'FAIL', 'FAIL', 'FAIL'),
    ('Olive (#3B3D2A)', 'AAA', 'FAIL', 'AAA', 'FAIL', 'AAA'),
    ('Gold (#B8860B)', 'AAA', 'FAIL', 'AAA', 'FAIL', 'FAIL'),
    ('Crimson (#8B1A1A)', 'AAA', 'AAA', 'AAA', 'AAA', 'FAIL'),
    ('White (#FDFCF8)', 'FAIL', 'FAIL', 'AAA', 'FAIL', 'AAA'),
]
pdf.set_font('Helvetica', '', 7)
pdf.set_text_color(58, 58, 52)
for row in rows:
    for i, cell in enumerate(row):
        fill = (i == 0)
        if fill:
            pdf.set_fill_color(237, 241, 248)
        pdf.cell(col_w[i], 5.5, cell, border=1, align='C', fill=fill)
    pdf.ln()

pdf.ln(3)

# ========== SECTION 4: TYPOGRAPHY ==========
pdf.section_title('03', 'TYPOGRAPHY')

pdf.body_text('Three fonts, each with a distinct rank. Cormorant Garamond for command-level presence (page titles, hero text). Outfit for all operational UI text (body, buttons, navigation). DM Mono for precision data -- codes, timestamps, registration numbers, table headers.')

pdf.ln(2)
pdf.sub_heading('Cormorant Garamond -- Display Font')
pdf.set_font('Helvetica', 'B', 9)
pdf.set_text_color(28, 28, 24)
pdf.cell(0, 5, 'Regular  .  Medium  .  SemiBold', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(58, 58, 52)
pdf.cell(0, 5, 'Page titles, hero text, dashboard greetings -- 52px -> 40px -> 32px', new_x="LMARGIN", new_y="NEXT")
pdf.ln(2)

pdf.set_font('Helvetica', 'B', 9)
pdf.set_text_color(28, 28, 24)
pdf.cell(0, 5, 'SAMPLE: Examination Portal', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', 'I', 18)
pdf.set_text_color(28, 28, 24)
pdf.cell(0, 10, 'Examination', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', 'BI', 18)
pdf.set_text_color(74, 96, 144)
pdf.cell(0, 10, 'Portal', new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)

pdf.sub_heading('Outfit -- UI Font')
pdf.set_font('Helvetica', 'B', 9)
pdf.set_text_color(28, 28, 24)
pdf.cell(0, 5, 'Light (300)  .  Regular (400)  .  Medium (500)  .  SemiBold (600)', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(58, 58, 52)
pdf.cell(0, 5, 'Body text, buttons, form labels, navigation, card titles -- 15px base', new_x="LMARGIN", new_y="NEXT")
pdf.ln(2)
pdf.set_font('Helvetica', '', 10)
pdf.set_text_color(58, 58, 52)
pdf.cell(0, 5, 'Cadets must complete the examination within the allotted time window.', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', 'B', 10)
pdf.set_text_color(28, 28, 24)
pdf.cell(0, 5, 'B-Cert Theory Examination', new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)

pdf.sub_heading('DM Mono -- Data Font')
pdf.set_font('Helvetica', 'B', 9)
pdf.set_text_color(28, 28, 24)
pdf.cell(0, 5, 'Regular (400)  .  Medium (500)  -- Uppercase for labels', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(58, 58, 52)
pdf.cell(0, 5, 'Regimental numbers, timestamps, IDs, table headers -- 10-13px', new_x="LMARGIN", new_y="NEXT")
pdf.ln(2)
pdf.set_font('Courier', '', 9)
pdf.set_text_color(58, 58, 52)
pdf.cell(0, 5, 'AP/TRP/01234', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Courier', '', 8)
pdf.set_text_color(154, 154, 142)
pdf.cell(0, 5, '12 APR 2026 . 09:47:23', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Courier', 'B', 7)
pdf.set_text_color(106, 106, 96)
pdf.cell(0, 5, 'REGIMENTAL NUMBER', new_x="LMARGIN", new_y="NEXT")

pdf.ln(3)
pdf.note_box('Rule: Use Cormorant Garamond only for page-level headings and the dashboard greeting. All UI text -- buttons, labels, table cells, nav items -- uses Outfit. DM Mono is reserved for structured data only, never for flowing prose.')

# ========== SECTION 5: SPACING ==========
pdf.section_title('04', 'SPACING SCALE')

pdf.body_text('Built on a strict 4px base unit. Every margin, padding, and gap is a multiple of 4. Generous spacing signals discipline and gives the interface room to breathe -- a well-drilled parade ground, not a cluttered barracks.')

spacing = [
    ('4px', 'sp-1', 'Icon-to-label gap, badge internal'),
    ('8px', 'sp-2', 'Row gaps, tag spacing'),
    ('12px', 'sp-3', 'Card internal gap, list item spacing'),
    ('16px', 'sp-4', 'Card padding, form field gap'),
    ('24px', 'sp-6', 'Section internal spacing'),
    ('32px', 'sp-8', 'Component-to-component gap'),
    ('48px', 'sp-12', 'Section margin, page rhythm'),
    ('64px', 'sp-16', 'Page-level padding (desktop)'),
]

pdf.set_font('Helvetica', 'B', 8)
pdf.set_text_color(28, 28, 24)
pdf.set_fill_color(237, 241, 248)
pdf.cell(20, 6, 'Size', border=1, align='C', fill=True)
pdf.cell(18, 6, 'Token', border=1, align='C', fill=True)
pdf.cell(100, 6, 'Visual', border=1, align='C', fill=True)
pdf.cell(52, 6, 'Usage', border=1, align='C', fill=True)
pdf.ln()

for name, token, usage in spacing:
    pdf.set_font('Helvetica', '', 7.5)
    pdf.set_text_color(58, 58, 52)
    y_before = pdf.get_y()
    pdf.cell(20, 8, name, border=1, align='C')
    pdf.cell(18, 8, token, border=1, align='C')
    
    # Visual bar
    x_bar = pdf.get_x()
    y_bar = pdf.get_y()
    bar_w = int(name.replace('px', '')) * 1.5
    pdf.set_fill_color(74, 96, 144)
    pdf.rect(x_bar + 2, y_bar + 2, min(bar_w, 96), 4, 'F')
    pdf.set_draw_color(204, 200, 188)
    pdf.rect(x_bar, y_bar, 100, 8, 'D')
    pdf.set_xy(x_bar + 100, y_bar)
    
    pdf.cell(52, 8, usage, border=1)
    pdf.ln()

pdf.ln(2)
pdf.note_box('Minimum 36px height for all interactive elements on desktop. 44px for primary actions. This is non-negotiable -- do not shrink buttons, inputs, or table row heights below these values.')

# ========== SECTION 5: COMPONENTS ==========
pdf.section_title('05', 'COMPONENTS')

pdf.sub_heading('Buttons')
pdf.body_text('Every button communicates the weight and consequence of its action. Primary actions are navy -- they carry authority. Destructive actions are crimson-tinted, never navy. Gold is reserved for promotion and rank actions only.')

btn_data = [
    ('Primary', '#1A2744', '#F4F0E4', 'Publish examination'),
    ('Secondary', '#EEF0E0', '#3B3D2A', 'Save draft'),
    ('Ghost', 'transparent', '#3A3A34', 'Cancel'),
    ('Danger', '#FAEAEA', '#8B1A1A', 'Disable cadet'),
    ('Gold', '#FBF5DC', '#B8860B', 'Promote to ANO'),
]

pdf.set_font('Helvetica', '', 8)
for name, bg, color, label in btn_data:
    y = pdf.get_y()
    if name == 'Primary':
        pdf.set_fill_color(26, 39, 68)
        pdf.set_text_color(244, 240, 228)
    elif name == 'Secondary':
        pdf.set_fill_color(238, 240, 224)
        pdf.set_text_color(59, 61, 42)
        pdf.set_draw_color(200, 204, 158)
    elif name == 'Ghost':
        pdf.set_fill_color(253, 252, 248)
        pdf.set_text_color(58, 58, 52)
        pdf.set_draw_color(204, 200, 188)
    elif name == 'Danger':
        pdf.set_fill_color(250, 234, 234)
        pdf.set_text_color(139, 26, 26)
        pdf.set_draw_color(240, 149, 149)
    elif name == 'Gold':
        pdf.set_fill_color(251, 245, 220)
        pdf.set_text_color(184, 134, 11)
        pdf.set_draw_color(240, 220, 130)
    
    pdf.rect(15, y, 180, 8, 'FD')
    pdf.set_xy(17, y + 1.5)
    pdf.cell(100, 5, f'{name} -- {label}')
    pdf.ln(9)

pdf.ln(2)
pdf.note_box('Button hierarchy rule: Only one Primary button per screen section. If two actions appear side-by-side, the lesser action is Ghost. Destructive buttons must never be Primary -- they are always Danger variant with a confirmation step before any API call fires.')

pdf.ln(2)
pdf.sub_heading('Badges & Status')
pdf.body_text('Status badges carry tactical meaning at a glance. They are always monospaced, always pill-shaped, always using the wash-to-base colour pairing. No icons inside badges.')

badges = [
    ('Draft', '#E8E4D8', '#6A6A60'),
    ('Published', '#EDF1F8', '#253660'),
    ('In Progress', '#EAF3DE', '#3B6D11'),
    ('Closed', '#FAEAEA', '#8B1A1A'),
    ('Active', '#EAF3DE', '#3B6D11'),
    ('Suspended', '#FAEAEA', '#8B1A1A'),
    ('Passed', '#EDF1F8', '#253660'),
    ('Failed', '#FAEAEA', '#8B1A1A'),
    ('Submitted', '#EEF0E0', '#5A5E3E'),
    ('Timed Out', '#FBF5DC', '#B8860B'),
    ('Army', '#EEF0E0', '#3B3D2A'),
    ('Navy', '#EDF1F8', '#1A2744'),
    ('Air Force', '#E8E4D8', '#3A3A34'),
]

pdf.set_font('Helvetica', '', 7)
x = 15
y = pdf.get_y()
for i, (label, bg, text) in enumerate(badges):
    if i > 0 and i % 5 == 0:
        pdf.ln(8)
        x = 15
        y = pdf.get_y()
    
    r = int(bg[1:3], 16)
    g = int(bg[3:5], 16)
    b = int(bg[5:7], 16)
    pdf.set_fill_color(r, g, b)
    
    tr = int(text[1:3], 16)
    tg = int(text[3:5], 16)
    tb = int(text[5:7], 16)
    pdf.set_text_color(tr, tg, tb)
    
    w = pdf.get_string_width(label) + 10
    pdf.set_xy(x, y)
    pdf.rect(x, y, w, 5.5, 'FD')
    pdf.set_xy(x + 2, y + 0.5)
    pdf.cell(w - 4, 4.5, label)
    x += w + 4

pdf.set_y(y + 12)

pdf.sub_heading('Form Fields')
pdf.body_text('Form labels are DM Mono, uppercase, tracked -- a direct reference to the precision of military documentation. Fields are generous at 38px minimum height. States are unambiguous: default, focus (navy ring), error (crimson ring).')

# Form field visual
pdf.set_draw_color(204, 200, 188)
pdf.set_fill_color(253, 252, 248)
y = pdf.get_y()
# Label
pdf.set_font('Courier', 'B', 7)
pdf.set_text_color(106, 106, 96)
pdf.set_xy(15, y)
pdf.cell(0, 4, 'REGIMENTAL NUMBER')
# Input
pdf.set_xy(15, y + 5)
pdf.rect(15, y + 5, 100, 6, 'DF')
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(28, 28, 24)
pdf.set_xy(18, y + 5.5)
pdf.cell(94, 5, 'AP/TRP/00000')
# Hint
pdf.set_font('Helvetica', '', 7)
pdf.set_text_color(154, 154, 142)
pdf.set_xy(15, y + 12)
pdf.cell(0, 3.5, 'Format: State / Unit / Serial (e.g. AP/TRP/01234)')

pdf.set_y(y + 20)
# Focus state
pdf.set_font('Courier', 'B', 7)
pdf.set_text_color(106, 106, 96)
pdf.set_xy(15, pdf.get_y())
pdf.cell(0, 4, 'EMAIL ADDRESS (FOCUS)')
y2 = pdf.get_y()
pdf.set_draw_color(74, 96, 144)
pdf.set_fill_color(237, 241, 248)
pdf.rect(15, y2 + 5, 100, 6, 'FD')
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(28, 28, 24)
pdf.set_xy(18, y2 + 5.5)
pdf.cell(94, 5, 'arjun.k@svcollege.edu')
pdf.set_y(y2 + 18)

# Error state
pdf.set_font('Courier', 'B', 7)
pdf.set_text_color(106, 106, 96)
pdf.set_xy(15, pdf.get_y())
pdf.cell(0, 4, 'EXAM DURATION (ERROR)')
y3 = pdf.get_y()
pdf.set_draw_color(192, 59, 59)
pdf.set_fill_color(250, 234, 234)
pdf.rect(15, y3 + 5, 100, 6, 'FD')
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(139, 26, 26)
pdf.set_xy(18, y3 + 5.5)
pdf.cell(94, 5, '0')
pdf.set_font('Helvetica', '', 7)
pdf.set_text_color(139, 26, 26)
pdf.set_xy(15, y3 + 12)
pdf.cell(0, 3.5, 'Duration must be at least 10 minutes')

pdf.set_y(y3 + 22)

pdf.sub_heading('Tables')
pdf.body_text('Tables carry the most critical data. Headers are DM Mono -- precision labels. Row height is 44px. Hover states are subtle. Action column is always rightmost and right-aligned.')

# Table header
pdf.set_font('Courier', 'B', 7)
pdf.set_text_color(154, 154, 142)
pdf.set_fill_color(244, 242, 236)
col_widths = [10, 45, 30, 22, 22, 22, 25]
headers = ['', 'Cadet', 'Reg. Number', 'Wing', 'Score', 'Status', 'Actions']
for i, h in enumerate(headers):
    pdf.cell(col_widths[i], 6, h, border=1, align='C', fill=True)
pdf.ln()

# Table rows
rows = [
    ('Arjun Kumar', 'AP/TRP/01234', 'Army', '29/30', 'Passed', 'View Edit', ''),
    ('Priya Menon', 'AP/TRP/01235', 'Navy', '12/30', 'Failed', 'View Edit', ''),
    ('Ravi Srinivas', 'AP/TRP/01236', 'Air Force', '--', 'No Attempt', 'View Edit', ''),
]

for row in rows:
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(28, 28, 24)
    pdf.set_fill_color(253, 252, 248)
    pdf.cell(col_widths[0], 7, '', border=1, fill=True)
    pdf.cell(col_widths[1], 7, row[0], border=1, fill=True)
    pdf.set_font('Courier', '', 7.5)
    pdf.set_text_color(58, 58, 52)
    pdf.cell(col_widths[2], 7, row[1], border=1, align='C', fill=True)
    
    # Wing badge
    wing = row[2]
    if wing == 'Army':
        pdf.set_fill_color(238, 240, 224)
        pdf.set_text_color(59, 61, 42)
    elif wing == 'Navy':
        pdf.set_fill_color(237, 241, 248)
        pdf.set_text_color(26, 39, 68)
    else:
        pdf.set_fill_color(232, 228, 216)
        pdf.set_text_color(58, 58, 52)
    pdf.set_font('Helvetica', '', 7)
    x_wing = pdf.get_x()
    y_wing = pdf.get_y()
    w_wing = pdf.get_string_width(wing) + 8
    pdf.rect(x_wing, y_wing + 0.5, w_wing, 5, 'FD')
    pdf.set_xy(x_wing + 2, y_wing + 0.5)
    pdf.cell(w_wing - 4, 5, wing)
    pdf.set_xy(x_wing + col_widths[3], y_wing)
    
    pdf.set_font('Courier', 'B', 8)
    if row[4] == 'Passed':
        pdf.set_text_color(59, 109, 17)
    elif row[4] == 'Failed':
        pdf.set_text_color(139, 26, 26)
    else:
        pdf.set_text_color(154, 154, 142)
    pdf.cell(col_widths[4], 7, row[4], border=1, align='C', fill=True)
    
    # Status badge
    status = row[5]
    if status == 'Passed':
        pdf.set_fill_color(237, 241, 248)
        pdf.set_text_color(37, 54, 96)
    elif status == 'Failed':
        pdf.set_fill_color(250, 234, 234)
        pdf.set_text_color(139, 26, 26)
    elif status == 'No Attempt':
        pdf.set_fill_color(232, 228, 216)
        pdf.set_text_color(106, 106, 96)
    pdf.set_font('Helvetica', '', 7)
    x_stat = pdf.get_x()
    y_stat = pdf.get_y()
    w_stat = pdf.get_string_width(status) + 8
    pdf.rect(x_stat, y_stat + 0.5, w_stat, 5, 'FD')
    pdf.set_xy(x_stat + 2, y_stat + 0.5)
    pdf.cell(w_stat - 4, 5, status)
    pdf.set_xy(x_stat + col_widths[5], y_stat)
    
    pdf.set_font('Helvetica', '', 7.5)
    pdf.set_text_color(58, 58, 52)
    pdf.cell(col_widths[6], 7, row[6], border=1, align='R', fill=True)
    pdf.ln()

pdf.ln(3)

pdf.sub_heading('Stat Cards')
pdf.body_text('Command-level summary numbers. The value is set in Cormorant Garamond -- the display font lends numerical data authority. Labels are DM Mono. Context text is Outfit Light.')

stat_cards = [
    ('Total Cadets Enrolled', '1,284', 'Across 6 affiliated colleges', '#1A2744'),
    ('Live Examinations', '3', '247 cadets currently attempting', '#3B3D2A'),
    ('Unit Pass Rate', '68%', 'Last 30 days . all examinations', '#B8860B'),
]

x = 15
for label, val, sub, color in stat_cards:
    r = int(color[1:3], 16)
    g = int(color[3:5], 16)
    b = int(color[5:7], 16)
    
    pdf.set_fill_color(253, 252, 248)
    pdf.set_draw_color(204, 200, 188)
    y_card = pdf.get_y()
    pdf.rect(x, y_card, 58, 30, 'FD')
    
    pdf.set_font('Courier', 'B', 6.5)
    pdf.set_text_color(154, 154, 142)
    pdf.set_xy(x + 3, y_card + 3)
    pdf.cell(52, 3.5, label)
    
    pdf.set_font('Helvetica', 'B', 18)
    pdf.set_text_color(r, g, b)
    pdf.set_xy(x + 3, y_card + 8)
    pdf.cell(52, 10, val)
    
    pdf.set_font('Helvetica', '', 7)
    pdf.set_text_color(154, 154, 142)
    pdf.set_xy(x + 3, y_card + 19)
    pdf.multi_cell(52, 3.5, sub)
    
    x += 62

pdf.set_y(y_card + 35)

pdf.sub_heading('Feedback & Toasts')
pdf.body_text('System feedback messages are minimal and direct. A coloured dot encodes the category -- no icons, no heavy colours, no emoji. Every message uses active voice.')

toasts = [
    ('Success', '#639922', 'Examination published. Cadets can now attempt from 12 Apr 09:00 onwards.'),
    ('Error', '#C44040', 'Attempt blocked -- Cadet AP/TRP/01236 has already submitted this examination.'),
    ('Info', '#4A6090', 'Auto-saving answers. Last saved at 10:34:22.'),
    ('Warning', '#B8860B', '12 minutes remaining. Your answers are saved automatically.'),
]

for label, dot_color, msg in toasts:
    y = pdf.get_y()
    pdf.set_fill_color(253, 252, 248)
    r = int(dot_color[1:3], 16)
    g = int(dot_color[3:5], 16)
    b = int(dot_color[5:7], 16)
    pdf.set_draw_color(r, g, b)
    pdf.rect(15, y, 180, 12, 'FD')
    
    # Dot
    pdf.set_fill_color(r, g, b)
    pdf.ellipse(19, y + 4, 4, 4, 'F')
    
    pdf.set_font('Helvetica', 'B', 7.5)
    pdf.set_text_color(28, 28, 24)
    pdf.set_xy(27, y + 1)
    pdf.cell(160, 4, label)
    pdf.set_font('Helvetica', '', 7.5)
    pdf.set_text_color(58, 58, 52)
    pdf.set_xy(27, y + 5.5)
    pdf.cell(160, 4, msg)
    pdf.ln(14)

pdf.ln(2)
pdf.note_box('Toast messages appear bottom-right, stack upward, and auto-dismiss after 5 seconds. Errors do not auto-dismiss -- the cadet must acknowledge them. Toasts that confirm background saves (auto-save) use Info, not Success -- success is reserved for cadet-initiated actions.')

# ========== SECTION 6: VOICE & TONE ==========
pdf.section_title('06', 'VOICE & TONE')

pdf.body_text('The portal speaks with the measured authority of the NCC. Precise, respectful, never casual. It never over-explains; it assumes the cadet knows their duty. Error messages are direct without being harsh.')

pdf.sub_heading('Use -- Clear & Precise')
good = [
    'Examination submitted. Your score will be available shortly.',
    'You do not have permission to access this examination.',
    'Session expired. Sign in again to continue.',
    '12 questions answered. 8 questions remaining.',
    'Cadet AP/TRP/01234 has been suspended.',
]
pdf.set_font('Helvetica', '', 8)
pdf.set_text_color(59, 109, 17)
for g in good:
    pdf.cell(5, 4.5, '*')
    pdf.multi_cell(0, 4.5, g)
    pdf.ln(1)

pdf.ln(1)
pdf.sub_heading('Avoid -- Vague or Casual')
bad = [
    'Oops! Something went wrong. Please try again!',
    'You cant do this right now.',
    'Uh oh -- your session timed out.',
    'Almost done! Just a few more questions to go!',
    'User has been disabled successfully!',
]
pdf.set_font('Helvetica', '', 8)
pdf.set_text_color(139, 26, 26)
for b in bad:
    pdf.cell(5, 4.5, '*')
    pdf.multi_cell(0, 4.5, b)
    pdf.ln(1)

pdf.ln(2)
pdf.sub_heading('Tone by Context')
tone_data = [
    ('System success', 'Calm confirmation', 'Examination published successfully.'),
    ('Validation error', 'Specific, not accusatory', 'Examination must have at least one question before publishing.'),
    ('Destructive action', 'Clear consequence, no drama', 'This will suspend the cadet\'s access. This cannot be undone without admin intervention.'),
    ('Empty states', 'Directive, not apologetic', 'No examinations scheduled. Create the first examination for this batch.'),
    ('Timer warning', 'Factual, calm urgency', '15 minutes remaining. Your answers are saved.'),
]

pdf.set_font('Helvetica', 'B', 7.5)
pdf.set_text_color(28, 28, 24)
pdf.set_fill_color(237, 241, 248)
pdf.cell(35, 6, 'Context', border=1, align='C', fill=True)
pdf.cell(40, 6, 'Tone', border=1, align='C', fill=True)
pdf.cell(115, 6, 'Example', border=1, align='C', fill=True)
pdf.ln()

pdf.set_font('Helvetica', '', 7)
pdf.set_text_color(58, 58, 52)
for ctx, tone, ex in tone_data:
    pdf.cell(35, 6, ctx, border=1, align='C')
    pdf.cell(40, 6, tone, border=1, align='C')
    pdf.cell(115, 6, ex, border=1)
    pdf.ln()

# ========== SECTION 7: TERMINOLOGY ==========
pdf.ln(3)
pdf.section_title('07', 'TERMINOLOGY GUIDE')

pdf.body_text('Consistent language throughout the interface. The NCC has its own precise vocabulary -- use it. Never mix civilian equivalents with NCC terms in the same interface context.')

terms = [
    ('Student', 'Cadet', 'NCC members are cadets, not students'),
    ('Teacher / Admin', 'ANO / Officer', 'Associate NCC Officer is the correct title'),
    ('Test / Quiz', 'Examination', 'Formal context -- the word carries weight'),
    ('Roll number', 'Regimental number', 'NCC-specific identifier format'),
    ('School / Institute', 'College', 'NCC units are affiliated with colleges'),
    ('Group', 'Battalion / Unit', 'Use the correct organisational term'),
    ('Delete', 'Remove / Suspend', 'Hard deletes are disallowed; use soft actions'),
    ('Pass / Fail (verb)', 'Clear / Not clear', 'Less harsh phrasing for cadet-facing text'),
    ('Dashboard', 'Command centre', 'NCC vocabulary -- use in display headings only'),
    ('Sign up', 'Enrol', 'Cadets enrol, they do not sign up'),
]

pdf.set_font('Helvetica', 'B', 7.5)
pdf.set_text_color(28, 28, 24)
pdf.set_fill_color(237, 241, 248)
pdf.cell(35, 6, 'Never Use', border=1, align='C', fill=True)
pdf.cell(35, 6, 'Always Use', border=1, align='C', fill=True)
pdf.cell(120, 6, 'Reason', border=1, align='C', fill=True)
pdf.ln()

pdf.set_font('Helvetica', '', 7)
pdf.set_text_color(58, 58, 52)
for never, always, reason in terms:
    pdf.cell(35, 5.5, never, border=1, align='C')
    pdf.set_text_color(139, 26, 26)
    pdf.cell(35, 5.5, always, border=1, align='C')
    pdf.set_text_color(58, 58, 52)
    pdf.cell(120, 5.5, reason, border=1)
    pdf.ln()

# ========== SECTION 8: ELEVATION ==========
pdf.ln(3)
pdf.section_title('08', 'ELEVATION & DEPTH')

pdf.body_text('Four levels of surface elevation. Achieved through border weight and subtle shadow -- never through background darkening. The hierarchy communicates rank, not decoration.')

elevations = [
    ('Level 0 -- Page', 'Background surface. Stone wash. For page bg only.', 'border: stone-mid . no shadow'),
    ('Level 1 -- Card', 'Standard content cards, table containers.', 'border: stone-deep . no shadow'),
    ('Level 2 -- Raised', 'Stat cards, active panels, selected states.', 'border: stone-deep . shadow sm'),
    ('Level 3 -- Floating', 'Drawers, dropdowns, dialogs.', 'border: navy-pale . shadow md'),
]

for title, desc, spec in elevations:
    y = pdf.get_y()
    if 'Page' in title:
        pdf.set_fill_color(244, 242, 236)
        pdf.set_draw_color(232, 228, 216)
    elif 'Card' in title and 'Raised' not in title:
        pdf.set_fill_color(253, 252, 248)
        pdf.set_draw_color(204, 200, 188)
    elif 'Raised' in title:
        pdf.set_fill_color(253, 252, 248)
        pdf.set_draw_color(204, 200, 188)
    else:
        pdf.set_fill_color(253, 252, 248)
        pdf.set_draw_color(184, 200, 224)
    
    pdf.rect(15, y, 55, 18, 'FD')
    pdf.set_font('Helvetica', 'B', 8)
    pdf.set_text_color(28, 28, 24)
    pdf.set_xy(17, y + 2)
    pdf.cell(51, 4, title)
    pdf.set_font('Helvetica', '', 7)
    pdf.set_text_color(106, 106, 96)
    pdf.set_xy(17, y + 7)
    pdf.multi_cell(51, 3.5, desc)
    
    pdf.set_font('Courier', '', 6.5)
    pdf.set_text_color(154, 154, 142)
    pdf.set_xy(75, y + 2)
    pdf.multi_cell(115, 3.5, spec)
    pdf.set_y(y + 22)

# ========== SECTION 9: GRID ==========
pdf.ln(3)
pdf.section_title('09', 'LAYOUT GRID')

pdf.body_text('8-column grid within the main content area. The sidebar occupies a fixed 220px lane -- the grid applies to everything right of it. Max content width: 960px. Form panels: 520px. Slide-over drawer: 440px. Confirm dialog: 400px. Toast notifications: 360px.')

# Grid visual
pdf.set_fill_color(253, 252, 248)
pdf.set_draw_color(204, 200, 188)
y_grid = pdf.get_y()
col_w = 22
gap = 2
for i in range(8):
    pdf.rect(15 + i * (col_w + gap), y_grid, col_w, 12, 'FD')
pdf.ln(16)

# Grid examples
pdf.set_fill_color(237, 241, 248)
pdf.set_draw_color(184, 200, 224)
pdf.rect(15, pdf.get_y(), 180, 12, 'FD')
pdf.set_font('Helvetica', '', 7)
pdf.set_text_color(28, 28, 24)
pdf.set_xy(17, pdf.get_y() + 2)
pdf.cell(0, 8, 'Full width (8 col)')
pdf.ln(16)

pdf.set_fill_color(238, 240, 224)
pdf.set_draw_color(200, 204, 158)
for i in range(4):
    pdf.rect(15 + i * (col_w * 2 + gap), pdf.get_y(), col_w * 2 + gap - 2, 12, 'FD')
pdf.ln(16)

pdf.set_fill_color(251, 245, 220)
pdf.set_draw_color(240, 220, 130)
for i in range(2):
    pdf.rect(15 + i * (col_w * 3 + gap * 2 + 2), pdf.get_y(), col_w * 3 + gap * 2, 12, 'FD')
pdf.rect(15 + 2 * (col_w * 3 + gap * 2 + 2), pdf.get_y(), col_w * 2 + gap, 12, 'FD')
pdf.ln(20)

# Save
output_path = r"C:\College Projects\ncc-exam-portal\NCC_Exam_Portal_Style_Guide.pdf"
pdf.output(output_path)
print(f"PDF saved to: {output_path}")
print(f"Pages: {pdf.page_no()}")