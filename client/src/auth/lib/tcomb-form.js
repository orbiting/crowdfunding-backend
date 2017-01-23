import t from 'tcomb-form/lib' // load tcomb-form without templates and i18n
import i18n from 'tcomb-form/lib/i18n/en'
import semantic from 'tcomb-form-templates-semantic'

t.form.Form.i18n = i18n
t.form.Form.templates = semantic

export default t
