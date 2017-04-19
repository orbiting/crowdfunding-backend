//
// This script exports open payments which needs to be send by postal service
//
// usage
// cf_server  node script/printPayments.js > script/data/printPayments.csv
//


const PgDb = require('../lib/pgdb')
const rw = require('rw')
const {dsvFormat} = require('d3-dsv')
const csvFormat = dsvFormat(';').format
const {timeFormat} = require('../lib/formats')
const {getFormatter} = require('../lib/translate')
const MESSAGES = require('../lib/translations.json').data
const generateMemberships = require('../lib/generateMemberships')
const sendPaymentSuccessful = require('../lib/sendPaymentSuccessful')

const t = getFormatter(MESSAGES)

const dateTimeFormat = timeFormat('%x %H:%M') //%x - the locale’s date

require('dotenv').config()

formatPrice = (price) => price/100

PgDb.connect().then( async (pgdb) => {
  //console.log('starting export...')

  //console.log('reading data...')
  const payments = await pgdb.public.payments.find({
    method: 'PAYMENTSLIP',
    status: 'WAITING'
  })
  const pledgePayments = await pgdb.public.pledgePayments.find({paymentId: payments.map( p => p.id )})
  const pledges = await pgdb.public.pledges.find({id: pledgePayments.map( p => p.pledgeId )})
  const pledgeOptions = await pgdb.public.pledgeOptions.find({pledgeId: pledges.map( p => p.id )})
  let packageOptions = await pgdb.public.packageOptions.find({id: pledgeOptions.map( p => p.templateId )})
  let rewards = await pgdb.public.rewards.find({id: packageOptions.map( p => p.rewardId )})
  const goodies = await pgdb.public.goodies.find({rewardId: rewards.map( p => p.id )})
  const membershipTypes = await pgdb.public.membershipTypes.find({rewardId: rewards.map( p => p.id )})

  let users = await pgdb.public.users.find({id: pledges.map( p => p.userId )})
  const addresses = await pgdb.public.addresses.find({id: users.map( p => p.addressId )})
  //console.log('data ready. assembling...')

  //assemble tree
  rewards = rewards.map( reward => {
    const goodie = goodies.find( g => g.rewardId === reward.id )
    const membershipType = membershipTypes.find( m => m.rewardId === reward.id )
    if(goodie) {
      return Object.assign({}, reward, {
        goodie,
        name: goodie.name
      })
    } else {
      return Object.assign({}, reward, {
        membershipType,
        name: membershipType.name
      })
    }
  })
  packageOptions = packageOptions.map( packageOption => {
    const reward = rewards.find( r => r.id === packageOption.rewardId )
    return Object.assign({}, packageOption, {
      reward
    })
  })

  users = users.map( user => {
    return Object.assign({}, user, {
      address: addresses.find( a => user.addressId === a.id )
    })
  })

  const exportData = payments.map( payment => {
    const pledgePayment = pledgePayments.find( p => p.paymentId === payment.id )
    const pledge = pledges.find( p => p.id === pledgePayment.pledgeId )
    const _pledgeOptions = pledgeOptions.filter( p => p.pledgeId === pledge.id ).map( pledgeOption => {
      const packageOption = packageOptions.find( p => pledgeOption.templateId === p.id )
      return Object.assign({}, pledgeOption, {
        template: packageOption
      })
    })
    //console.log(_pledgeOptions)

    let spendeCountedAsPledgeOption = false
    const produkte = _pledgeOptions.map( pledgeOption => {
      if(pledgeOption.template.reward) {
        if(pledgeOption.template.reward.membershipType) {
          //memberships/type/ABO
          //memberships/type/BENEFACTOR_ABO
          let beschrieb = t('memberships/type/'+pledgeOption.template.reward.name)
          if(pledge.donation < 0)
            beschrieb = t('memberships/type/REDUCED_ABO')
          return {
            anzahl: pledgeOption.amount,
            beschrieb,
            preis: formatPrice(pledgeOption.price)
          }
        } else {// if(pledgeOption.template.reward.goodie) {
          return {
            anzahl: pledgeOption.amount,
            beschrieb: t('option/NOTEBOOK/label/1'),
            preis: formatPrice(pledgeOption.price)
          }
        }
      }
      else { //donation only pledge
        spendeCountedAsPledgeOption = true
        return {
          anzahl: 1,
          beschrieb: t('package/DONATE/title/short'),
          preis: formatPrice(pledge.total)
        }
      }
    })
    if(pledge.donation > 0 && !spendeCountedAsPledgeOption) {
      produkte.push({
        anzahl: '1',
        beschrieb: t('package/DONATE/title/short'),
        preis: formatPrice(pledge.donation)
      })
    }
    let step;
    for (step = produkte.length; step < 3; step++) {
      produkte.push({
        anzahl: '',
        beschrieb: '',
        preis: ''
      })
    }

    const user = users.find( u => u.id === pledge.userId )

    return {
      'exportedAlready':   payment.exported ? 'x' : '',
      'DatumTimestamp':    dateTimeFormat(payment.createdAt),
      'Payment ID':        payment.id.substring(0, 13),
      'HRID':              payment.hrid,
      'Vorname':           user.firstName,
      'Nachname':          user.lastName,
      'Anschrift':         user.address.name,
      'Adresse1':          user.address.line1,
      'Adresse2':          user.address.line2,
      'PLZ':               user.address.postalCode,
      'Ort':               user.address.city,
      'Land':              user.address.country,
      'BetragTotal':       formatPrice(payment.total),
      'Produkt1Anzahl':    produkte[0].anzahl,
      'Produkt1Beschrieb': produkte[0].beschrieb,
      'Produkt1Preis':     produkte[0].preis,
      'Produkt2Anzahl':    produkte[1].anzahl,
      'Produkt2Beschrieb': produkte[1].beschrieb,
      'Produkt2Preis':     produkte[1].preis,
      'Produkt3Anzahl':    produkte[2].anzahl,
      'Produkt3Beschrieb': produkte[2].beschrieb,
      'Produkt3Preis':     produkte[2].preis
    }
  })

  await pgdb.public.payments.update({id: payments.map( p => p.id )}, {
    exported: true
  })

  //console.log('writing file...')
  rw.writeFileSync('/dev/stdout', csvFormat(exportData), 'utf8')
}).then( () => {
  process.exit()
}).catch( e => {
  console.error(e)
  process.exit(1)
})
