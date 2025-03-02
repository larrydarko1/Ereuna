from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler
import time
import requests
from dotenv import load_dotenv
import os
from pymongo import MongoClient, UpdateOne
from bson import ObjectId
from datetime import datetime
from tqdm import tqdm
import pandas as pd
import numpy as np

app = FastAPI()

# uvicorn main:app --reload 

load_dotenv()  # Load environment variables from .env file

# MongoDB connection setup
mongo_uri = os.getenv('MONGODB_URI')  # Load MongoDB URI from environment variable
client = MongoClient(mongo_uri)
db = client['EreunaDB']  

tickers = ['A', 'AA', 'AACG', 'AACT', 'AADI', 'AAGR', 'AAGRW', 'AAL', 'AAM', 'AAME', 'AAMI', 'AAOI', 'AAON', 'AAP', 'AAPG', 'AAPL', 'AAT', 'AB', 'ABAT', 'ABBV', 'ABCB', 'ABCL', 'ABEO', 'ABEV', 'ABG', 'ABL', 'ABLLL', 'ABLLW', 'ABLV', 'ABLVW', 'ABM', 'ABNB', 'ABOS', 'ABPWW', 'ABR', 'ABSI', 'ABT', 'ABTS', 'ABUS', 'ABVC', 'ABVE', 'ABVEW', 'ABVX', 'AC', 'ACA', 'ACAD', 'ACB', 'ACCD', 'ACCO', 'ACDC', 'ACEL', 'ACET', 'ACGL', 'ACGLN', 'ACGLO', 'ACHC', 'ACHL', 'ACHR', 'ACHV', 'ACI', 'ACIC', 'ACIU', 'ACIW', 'ACLO', 'ACLS', 'ACLX', 'ACM', 'ACMR', 'ACN', 'ACNB', 'ACNT', 'ACOG', 'ACON', 'ACONW', 'ACR', 'ACRE', 'ACRS', 'ACRV', 'ACT', 'ACTG', 'ACTU', 'ACVA', 'ACXP', 'ADAG', 'ADAP', 'ADBE', 'ADC', 'ADCT', 'ADD', 'ADEA', 'ADEX', 'ADGM', 'ADI', 'ADIL', 'ADM', 'ADMA', 'ADN', 'ADNT', 'ADNWW', 'ADP', 'ADPT', 'ADSE', 'ADSEW', 'ADSK', 'ADT', 'ADTN', 'ADTX', 'ADUS', 'ADV', 'ADVM', 'ADXN', 'AEAE', 'AEAEU', 'AEAEW', 'AEE', 'AEFC', 'AEG', 'AEHL', 'AEHR', 'AEI', 'AEIS', 'AEM', 'AEMD', 'AENT', 'AENTW', 'AEO', 'AEP', 'AER', 'AERT', 'AERTW', 'AES', 'AESI', 'AEVA', 'AEVAW', 'AEYE', 'AFAR', 'AFARU', 'AFARW', 'AFBI', 'AFCG', 'AFG', 'AFGB', 'AFGC', 'AFGD', 'AFGE', 'AFIB', 'AFJK', 'AFJKR', 'AFJKU', 'AFL', 'AFMD', 'AFRI', 'AFRIW', 'AFRM', 'AFYA', 'AG', 'AGAE', 'AGCO', 'AGEN', 'AGFY', 'AGI', 'AGIO', 'AGL', 'AGM', 'AGMH', 'AGNC', 'AGNCL', 'AGNCM', 'AGNCN', 'AGNCO', 'AGNCP', 'AGO', 'AGRI', 'AGRO', 'AGS', 'AGX', 'AGYS', 'AHCO', 'AHG', 'AHH', 'AHR', 'AHT', 'AI', 'AIEV', 'AIFF', 'AIFU', 'AIG', 'AIHS', 'AIMAU', 'AIMAW', 'AIMBU', 'AIMD', 'AIMDW', 'AIN', 'AIO', 'AIOT', 'AIP', 'AIR', 'AIRE', 'AIRG', 'AIRJ', 'AIRJW', 'AIRS', 'AIRT', 'AIRTP', 'AISP', 'AISPW', 'AIT', 'AITR', 'AITRR', 'AITRU', 'AIV', 'AIXI', 'AIZ', 'AIZN', 'AJG', 'AKA', 'AKAM', 'AKAN', 'AKBA', 'AKR', 'AKRO', 'AKTSQ', 'AKTX', 'AKYA', 'AL', 'ALAB', 'ALAR', 'ALB', 'ALBT', 'ALC', 'ALCE', 'ALCO', 'ALCY', 'ALCYU', 'ALCYW', 'ALDF', 'ALDFU', 'ALDFW', 'ALDX', 'ALE', 'ALEC', 'ALEX', 'ALF', 'ALFUU', 'ALFUW', 'ALG', 'ALGM', 'ALGN', 'ALGS', 'ALGT', 'ALHC', 'ALIT', 'ALK', 'ALKS', 'ALKT', 'ALL', 'ALLE', 'ALLGF', 'ALLK', 'ALLO', 'ALLR', 'ALLT', 'ALLY', 'ALMS', 'ALNT', 'ALNY', 'ALOT', 'ALRM', 'ALRS', 'ALSN', 'ALT', 'ALTG', 'ALTI', 'ALTM', 'ALTO', 'ALTR', 'ALTS', 'ALUR', 'ALV', 'ALVO', 'ALVOW', 'ALVR', 'ALX', 'ALXO', 'ALYAF', 'ALZN', 'AM', 'AMAL', 'AMAT', 'AMBA', 'AMBC', 'AMBP', 'AMC', 'AMCR', 'AMCX', 'AMD', 'AMDG', 'AME', 'AMED', 'AMG', 'AMGN', 'AMH', 'AMIX', 'AMKR', 'AMLX', 'AMN', 'AMOD', 'AMODW', 'AMP', 'AMPG', 'AMPGW', 'AMPH', 'AMPL', 'AMPS', 'AMPX', 'AMPY', 'AMR', 'AMRC', 'AMRK', 'AMRN', 'AMRX', 'AMSC', 'AMSF', 'AMST', 'AMT', 'AMTB', 'AMTD', 'AMTM', 'AMTX', 'AMWD', 'AMWL', 'AMX', 'AMZN', 'AN', 'ANAB', 'ANDE', 'ANEB', 'ANET', 'ANF', 'ANGH', 'ANGHW', 'ANGI', 'ANGO', 'ANIK', 'ANIP', 'ANIX', 'ANL', 'ANNA', 'ANNAW', 'ANNX', 'ANRO', 'ANSC', 'ANSCU', 'ANSCW', 'ANSS', 'ANTE', 'ANTX', 'ANVS', 'ANY', 'AOMN', 'AOMR', 'AON', 'AONC', 'AONCW', 'AORT', 'AOS', 'AOSL', 'AOUT', 'AP', 'APA', 'APAM', 'APCX', 'APCXW', 'APD', 'APDN', 'APEI', 'APG', 'APGE', 'APH', 'API', 'APLD', 'APLE', 'APLM', 'APLMW', 'APLS', 'APLT', 'APM', 'APO', 'APOG', 'APOS', 'APP', 'APPF', 'APPN', 'APPS', 'APRE', 'APTO', 'APTV', 'APVO', 'APWC', 'APXIU', 'APXIW', 'APYX', 'AQB', 'AQMS', 'AQN', 'AQNB', 'AQST', 'AQU', 'AQUNR', 'AQUNU', 'AR', 'ARAV', 'ARAY', 'ARBB', 'ARBE', 'ARBEW', 'ARBK', 'ARBKL', 'ARCB', 'ARCC', 'ARCO', 'ARCT', 'ARDT', 'ARDX', 'ARE', 'AREB', 'AREBW', 'AREC', 'ARES', 'ARGD', 'ARGX', 'ARHS', 'ARI', 'ARIS', 'ARKO', 'ARKR', 'ARL', 'ARLO', 'ARLP', 'ARM', 'ARMK', 'AROC', 'AROW', 'ARQ', 'ARQQ', 'ARQQW', 'ARQT', 'ARR', 'ARRY', 'ARTL', 'ARTNA', 'ARTV', 'ARTW', 'ARVLF', 'ARVN', 'ARW', 'ARWR', 'AS', 'ASAN', 'ASB', 'ASBA', 'ASC', 'ASCBF', 'ASCRF', 'ASCWF', 'ASGI', 'ASGN', 'ASH', 'ASIX', 'ASLE', 'ASLN', 'ASMB', 'ASML', 'ASND', 'ASNS', 'ASO', 'ASPC', 'ASPCR', 'ASPCU', 'ASPI', 'ASPN', 'ASPS', 'ASR', 'ASRT', 'ASRV', 'ASST', 'ASTC', 'ASTE', 'ASTH', 'ASTI', 'ASTL', 'ASTLW', 'ASTS', 'ASUR', 'ASUUF', 'ASX', 'ASYS', 'ATAI', 'ATAT', 'ATCOL', 'ATEC', 'ATEN', 'ATER', 'ATEX', 'ATGE', 'ATGL', 'ATHA', 'ATHE', 'ATHM', 'ATHS', 'ATI', 'ATIP', 'ATKR', 'ATLC', 'ATLCL', 'ATLCP', 'ATLCZ', 'ATLN', 'ATLO', 'ATMC', 'ATMCR', 'ATMCU', 'ATMCW', 'ATMU', 'ATMV', 'ATMVR', 'ATMVU', 'ATNF', 'ATNFW', 'ATNI', 'ATO', 'ATOM', 'ATOS', 'ATPC', 'ATR', 'ATRA', 'ATRC', 'ATRO', 'ATS', 'ATSG', 'ATUS', 'ATXG', 'ATXI', 'ATXS', 'ATYR', 'AU', 'AUB', 'AUBN', 'AUDC', 'AUID', 'AUNA', 'AUPH', 'AUR', 'AURA', 'AUROW', 'AUTL', 'AUUD', 'AUUDW', 'AVA', 'AVAH', 'AVAL', 'AVAV', 'AVB', 'AVBP', 'AVD', 'AVDL', 'AVDX', 'AVGO', 'AVGR', 'AVIR', 'AVNS', 'AVNT', 'AVNW', 'AVO', 'AVPT', 'AVPTW', 'AVR', 'AVT', 'AVTE', 'AVTR', 'AVTX', 'AVXL', 'AVY', 'AWH', 'AWI', 'AWK', 'AWR', 'AWRE', 'AX', 'AXDX', 'AXGN', 'AXL', 'AXON', 'AXP', 'AXR', 'AXS', 'AXSM', 'AXTA', 'AXTI', 'AYI', 'AYRO', 'AYTU', 'AZ', 'AZEK', 'AZI', 'AZN', 'AZO', 'AZPN', 'AZTA', 'AZUL', 'AZZ', 'BA', 'BABA', 'BAC', 'BACK', 'BACQ', 'BACQR', 'BACQU', 'BAER', 'BAERW', 'BAFN', 'BAH', 'BAK', 'BALL', 'BALY', 'BAM', 'BANC', 'BAND', 'BANF', 'BANFP', 'BANL', 'BANR', 'BANX', 'BAOS', 'BAP', 'BARK', 'BASE', 'BATRA', 'BATRK', 'BAX', 'BAYA', 'BAYAR', 'BAYAU', 'BB', 'BBAI', 'BBAR', 'BBCP', 'BBD', 'BBDC', 'BBDO', 'BBGI', 'BBIO', 'BBLG', 'BBLGW', 'BBNX', 'BBSI', 'BBU', 'BBUC', 'BBVA', 'BBW', 'BBWI', 'BBY', 'BC', 'BC/PA', 'BC/PC', 'BCAB', 'BCAL', 'BCAT', 'BCAX', 'BCBP', 'BCC', 'BCDA', 'BCE', 'BCG', 'BCGWW', 'BCH', 'BCLI', 'BCLO', 'BCML', 'BCO', 'BCOW', 'BCPC', 'BCRX', 'BCS', 'BCSF', 'BCTX', 'BCTXW', 'BCYC', 'BDC', 'BDMD', 'BDMDW', 'BDN', 'BDRX', 'BDSX', 'BDTX', 'BDX', 'BE', 'BEAG', 'BEAGR', 'BEAGU', 'BEAM', 'BEAT', 'BEATW', 'BECN', 'BEDU', 'BEEM', 'BEEX', 'BEKE', 'BELFA', 'BELFB', 'BEN', 'BENF', 'BENFW', 'BEP', 'BEPC', 'BEPH', 'BEPI', 'BEPJ', 'BERY', 'BEST', 'BETR', 'BETRW', 'BFAM', 'BFC', 'BFH', 'BFICQ', 'BFIN', 'BFIWQ', 'BFLY', 'BFRG', 'BFRGW', 'BFRI', 'BFRIW', 'BFS', 'BFST', 'BG', 'BGC', 'BGFV', 'BGLC', 'BGM', 'BGS', 'BGSF', 'BGXX', 'BH', 'BHAT', 'BHC', 'BHE', 'BHF', 'BHFAL', 'BHFAM', 'BHFAN', 'BHFAO', 'BHFAP', 'BHIL', 'BHLB', 'BHP', 'BHR', 'BHRB', 'BHVN', 'BIAF', 'BIAFW', 'BIDU', 'BIGC', 'BIGZ', 'BIIB', 'BILI', 'BILL', 'BIMI', 'BIO', 'BIOA', 'BIOX', 'BIP', 'BIPC', 'BIPH', 'BIPI', 'BIPJ', 'BIRD', 'BIRK', 'BITF', 'BIVI', 'BJ', 'BJDX', 'BJRI', 'BK', 'BKD', 'BKDT', 'BKE', 'BKH', 'BKHA', 'BKHAR', 'BKHAU', 'BKKT', 'BKNG', 'BKR', 'BKSY', 'BKU', 'BKV', 'BKYI', 'BL', 'BLAC', 'BLACR', 'BLACU', 'BLACW', 'BLBD', 'BLBX', 'BLCO', 'BLD', 'BLDE', 'BLDEW', 'BLDP', 'BLDR', 'BLFS', 'BLFY', 'BLIN', 'BLK', 'BLKB', 'BLMN', 'BLMZ', 'BLND', 'BLNE', 'BLNK', 'BLRX', 'BLTE', 'BLUE', 'BLX', 'BLZE', 'BMA', 'BMAC', 'BMBL', 'BMEA', 'BMEZ', 'BMI', 'BMN', 'BMO', 'BMR', 'BMRA', 'BMRC', 'BMRN', 'BMY', 'BN', 'BNAI', 'BNAIW', 'BNED', 'BNGO', 'BNH', 'BNIX', 'BNIXR', 'BNIXW', 'BNJ', 'BNL', 'BNR', 'BNRG', 'BNS', 'BNT', 'BNTC', 'BNTX', 'BNZI', 'BNZIW', 'BOC', 'BODI', 'BOF', 'BOH', 'BOKF', 'BOLD', 'BOLT', 'BON', 'BOOM', 'BOOT', 'BORR', 'BOSC', 'BOTJ', 'BOW', 'BOWN', 'BOWNR', 'BOWNU', 'BOX', 'BOXL', 'BP', 'BPMC', 'BPOP', 'BPOPM', 'BPRN', 'BPT', 'BPTH', 'BPTSY', 'BPYPM', 'BPYPN', 'BPYPO', 'BPYPP', 'BR', 'BRAG', 'BRBR', 'BRC', 'BRCC', 'BRDG', 'BREA', 'BRFH', 'BRFS', 'BRID', 'BRIF', 'BRKD', 'BRKL', 'BRKR', 'BRKU', 'BRLS', 'BRLSW', 'BRLT', 'BRNS', 'BRO', 'BROG', 'BROS', 'BRQSF', 'BRSP', 'BRT', 'BRTX', 'BRW', 'BRX', 'BRY', 'BRZE', 'BSAC', 'BSBK', 'BSBR', 'BSET', 'BSII', 'BSIIU', 'BSIIW', 'BSLK', 'BSLKW', 'BSM', 'BSRR', 'BSTZ', 'BSVN', 'BSX', 'BSY', 'BTAI', 'BTBD', 'BTBDW', 'BTBT', 'BTCM', 'BTCS', 'BTCT', 'BTCTW', 'BTCY', 'BTDR', 'BTE', 'BTI', 'BTM', 'BTMD', 'BTMDW', 'BTMWW', 'BTOC', 'BTOG', 'BTSG', 'BTSGU', 'BTU', 'BUD', 'BUJA', 'BUJAR', 'BUJAU', 'BUJAW', 'BUR', 'BURL', 'BUSE', 'BV', 'BVFL', 'BVN', 'BVS', 'BW', 'BWA', 'BWAY', 'BWB', 'BWBBP', 'BWEN', 'BWFG', 'BWIN', 'BWLP', 'BWMN', 'BWMX', 'BWNB', 'BWSN', 'BWXT', 'BX', 'BXC', 'BXMT', 'BXP', 'BXSL', 'BY', 'BYD', 'BYFC', 'BYND', 'BYNO', 'BYNOU', 'BYNOW', 'BYON', 'BYRN', 'BYSI', 'BZ', 'BZFD', 'BZFDW', 'BZH', 'BZUN', 'C', 'CAAP', 'CAAS', 'CABA', 'CABO', 'CAC', 'CACC', 'CACI', 'CADE', 'CADL', 'CAE', 'CAG', 'CAH', 'CAKE', 'CAL', 'CALC', 'CALM', 'CALT', 'CALX', 'CAMP', 'CAMT', 'CAN', 'CANB', 'CANG', 'CAPL', 'CAPN', 'CAPNR', 'CAPNU', 'CAPR', 'CAPT', 'CAPTW', 'CAR', 'CARA', 'CARE', 'CARG', 'CARM', 'CARR', 'CARS', 'CART', 'CARV', 'CAS', 'CASH', 'CASI', 'CASK', 'CASS', 'CASY', 'CAT', 'CATO', 'CATY', 'CAUD', 'CAVA', 'CB', 'CBAN', 'CBAT', 'CBFV', 'CBL', 'CBLL', 'CBNA', 'CBNK', 'CBO', 'CBRE', 'CBRL', 'CBSH', 'CBT', 'CBU', 'CBUS', 'CBZ', 'CC', 'CCAP', 'CCB', 'CCBG', 'CCCC', 'CCCS', 'CCEC', 'CCEP', 'CCG', 'CCGWW', 'CCI', 'CCIA', 'CCIR', 'CCIRU', 'CCIRW', 'CCIX', 'CCIXU', 'CCIXW', 'CCJ', 'CCK', 'CCL', 'CCLD', 'CCLDO', 'CCLDP', 'CCM', 'CCNE', 'CCNEP', 'CCO', 'CCOI', 'CCRD', 'CCRN', 'CCS', 'CCSI', 'CCTG', 'CCU', 'CCZ', 'CDE', 'CDIO', 'CDIOW', 'CDLR', 'CDLX', 'CDMO', 'CDNA', 'CDNS', 'CDP', 'CDRE', 'CDRO', 'CDROW', 'CDT', 'CDTG', 'CDTTW', 'CDTX', 'CDW', 'CDXC', 'CDXS', 'CDZI', 'CDZIP', 'CE', 'CEAD', 'CEADW', 'CECO', 'CEG', 'CELC', 'CELH', 'CELU', 'CELUW', 'CELZ', 'CENN', 'CENT', 'CENTA', 'CENX', 'CEP', 'CEPI', 'CEPO', 'CEPU', 'CERO', 'CEROW', 'CERS', 'CERT', 'CETX', 'CETXP', 'CETY', 'CEVA', 'CF', 'CFB', 'CFBK', 'CFFI', 'CFFN', 'CFFS', 'CFFSU', 'CFFSW', 'CFG', 'CFLT', 'CFR', 'CFSB', 'CG', 'CGABL', 'CGAU', 'CGBD', 'CGBDL', 'CGBS', 'CGBSW', 'CGC', 'CGEM', 'CGEN', 'CGNT', 'CGNX', 'CGON', 'CGTX', 'CHAR', 'CHARR', 'CHARU', 'CHCI', 'CHCO', 'CHCT', 'CHD', 'CHDN', 'CHE', 'CHEF', 'CHEK', 'CHGG', 'CHH', 'CHKP', 'CHMG', 'CHMI', 'CHNR', 'CHPT', 'CHR', 'CHRD', 'CHRS', 'CHRW', 'CHSCL', 'CHSCM', 'CHSCN', 'CHSCO', 'CHSCP', 'CHSN', 'CHT', 'CHTR', 'CHWY', 'CHX', 'CI', 'CIA', 'CIB', 'CICB', 'CIEN', 'CIFR', 'CIFRW', 'CIG', 'CIGI', 'CIM', 'CIMN', 'CIMO', 'CINF', 'CING', 'CINGW', 'CINT', 'CIO', 'CION', 'CISO', 'CISS', 'CIVB', 'CIVI', 'CIZN', 'CJET', 'CJJD', 'CJMB', 'CKPT', 'CL', 'CLAR', 'CLB', 'CLBK', 'CLBR', 'CLBT', 'CLCO', 'CLDT', 'CLDX', 'CLEU', 'CLF', 'CLFD', 'CLGN', 'CLH', 'CLIK', 'CLIR', 'CLLS', 'CLMB', 'CLMT', 'CLNE', 'CLNN', 'CLNNW', 'CLOV', 'CLPR', 'CLPS', 'CLPT', 'CLRB', 'CLRC', 'CLRCR', 'CLRCU', 'CLRCW', 'CLRO', 'CLS', 'CLSD', 'CLSK', 'CLSKW', 'CLST', 'CLVT', 'CLW', 'CLWT', 'CLX', 'CLYM', 'CM', 'CMA', 'CMBM', 'CMBT', 'CMC', 'CMCAU', 'CMCM', 'CMCO', 'CMCSA', 'CMCT', 'CME', 'CMG', 'CMI', 'CMLS', 'CMMB', 'CMND', 'CMP', 'CMPO', 'CMPOW', 'CMPR', 'CMPS', 'CMPX', 'CMRE', 'CMRX', 'CMS', 'CMSA', 'CMSC', 'CMSD', 'CMTG', 'CMTL', 'CNA', 'CNC', 'CNCKW', 'CNDT', 'CNET', 'CNEY', 'CNF', 'CNFR', 'CNFRZ', 'CNGL', 'CNH', 'CNI', 'CNK', 'CNL', 'CNM', 'CNMD', 'CNNE', 'CNO', 'CNOB', 'CNOBP', 'CNP', 'CNQ', 'CNR', 'CNS', 'CNSP', 'CNTA', 'CNTB', 'CNTGF', 'CNTM', 'CNTX', 'CNTY', 'CNVS', 'CNX', 'CNXC', 'CNXN', 'COCH', 'COCHW', 'COCO', 'COCP', 'CODA', 'CODI', 'CODX', 'COEP', 'COEPW', 'COF', 'COFS', 'COGT', 'COHR', 'COHU', 'COIN', 'COKE', 'COLAU', 'COLB', 'COLD', 'COLL', 'COLM', 'COMM', 'COMP', 'CON', 'CONNQ', 'COO', 'COOK', 'COOP', 'COOT', 'COOTW', 'COP', 'COR', 'CORT', 'CORZ', 'CORZW', 'CORZZ', 'COSM', 'COST', 'COTY', 'COUR', 'COYA', 'CP', 'CPA', 'CPAAW', 'CPAC', 'CPAY', 'CPB', 'CPBI', 'CPF', 'CPHC', 'CPIX', 'CPK', 'CPNG', 'CPOP', 'CPRI', 'CPRT', 'CPRX', 'CPS', 'CPSH', 'CPSS', 'CPT', 'CPZ', 'CR', 'CRAI', 'CRBD', 'CRBG', 'CRBP', 'CRBU', 'CRC', 'CRCT', 'CRDF', 'CRDL', 'CRDO', 'CREG', 'CRESW', 'CRESY', 'CREV', 'CREVW', 'CREX', 'CRGO', 'CRGOW', 'CRGX', 'CRGY', 'CRH', 'CRI', 'CRIS', 'CRK', 'CRKN', 'CRL', 'CRM', 'CRMD', 'CRML', 'CRMLW', 'CRMT', 'CRNC', 'CRNT', 'CRNX', 'CRON', 'CROX', 'CRS', 'CRSP', 'CRSR', 'CRT', 'CRTO', 'CRUS', 'CRVL', 'CRVO', 'CRVS', 'CRWD', 'CRWL', 'CRWS', 'CSAI', 'CSAN', 'CSBR', 'CSCI', 'CSCO', 'CSGP', 'CSGS', 'CSIQ', 'CSL', 'CSLMF', 'CSLR', 'CSLRW', 'CSNR', 'CSPI', 'CSR', 'CSRE', 'CSSNQ', 'CSTAF', 'CSTE', 'CSTL', 'CSTM', 'CSTUF', 'CSTWF', 'CSV', 'CSWC', 'CSWCZ', 'CSWI', 'CSX', 'CTAS', 'CTBB', 'CTBI', 'CTCX', 'CTCXW', 'CTDD', 'CTEST', 'CTHR', 'CTKB', 'CTLP', 'CTMX', 'CTNM', 'CTNT', 'CTO', 'CTOR', 'CTOS', 'CTRA', 'CTRE', 'CTRI', 'CTRM', 'CTRN', 'CTS', 'CTSH', 'CTSO', 'CTV', 'CTVA', 'CTXR', 'CUB', 'CUBB', 'CUBE', 'CUBI', 'CUBWU', 'CUBWW', 'CUE', 'CUK', 'CULL', 'CULP', 'CURB', 'CURI', 'CURIW', 'CURR', 'CURV', 'CUTR', 'CUZ', 'CVAC', 'CVBF', 'CVCO', 'CVE', 'CVEO', 'CVGI', 'CVGW', 'CVI', 'CVKD', 'CVLG', 'CVLT', 'CVNA', 'CVRX', 'CVS', 'CVU', 'CVV', 'CVX', 'CW', 'CWAN', 'CWBC', 'CWCO', 'CWD', 'CWEN', 'CWH', 'CWK', 'CWST', 'CWT', 'CX', 'CXAI', 'CXAIW', 'CXDO', 'CXM', 'CXT', 'CXW', 'CYAN', 'CYBR', 'CYCC', 'CYCCP', 'CYCN', 'CYD', 'CYH', 'CYN', 'CYRX', 'CYTH', 'CYTHW', 'CYTK', 'CZFS', 'CZNC', 'CZR', 'CZWI', 'D', 'DAC', 'DADA', 'DAIO', 'DAKT', 'DAL', 'DALN', 'DAN', 'DAO', 'DAR', 'DARE', 'DASH', 'DATS', 'DATSW', 'DAVA', 'DAVE', 'DAVEW', 'DAWN', 'DAY', 'DB', 'DBGI', 'DBI', 'DBRG', 'DBVT', 'DBX', 'DCBO', 'DCGO', 'DCI', 'DCO', 'DCOM', 'DCOMG', 'DCOMP', 'DCTH', 'DD', 'DDC', 'DDD', 'DDI', 'DDL', 'DDOG', 'DDS', 'DDT', 'DE', 'DEA', 'DEC', 'DECA', 'DECAU', 'DECAW', 'DECK', 'DEI', 'DELL', 'DENN', 'DEO', 'DERM', 'DESP', 'DEVS', 'DFH', 'DFIN', 'DFLI', 'DFLIW', 'DFS', 'DG', 'DGHI', 'DGICA', 'DGICB', 'DGII', 'DGLY', 'DGNX', 'DGX', 'DH', 'DHAI', 'DHAIW', 'DHC', 'DHCNI', 'DHCNL', 'DHI', 'DHIL', 'DHR', 'DHT', 'DHX', 'DIBS', 'DIN', 'DINO', 'DIOD', 'DIS', 'DIST', 'DISTR', 'DISTW', 'DJCO', 'DJT', 'DJTWW', 'DK', 'DKL', 'DKNG', 'DKS', 'DLB', 'DLHC', 'DLNG', 'DLO', 'DLPN', 'DLR', 'DLTH', 'DLTR', 'DLX', 'DLY', 'DM', 'DMA', 'DMAAU', 'DMAC', 'DMLP', 'DMN', 'DMRC', 'DMX', 'DNA', 'DNB', 'DNLI', 'DNOW', 'DNTH', 'DNUT', 'DOC', 'DOCN', 'DOCS', 'DOCU', 'DOGZ', 'DOLE', 'DOMH', 'DOMO', 'DOOO', 'DORM', 'DOUG', 'DOV', 'DOW', 'DOX', 'DOYU', 'DPRO', 'DPZ', 'DQ', 'DRCT', 'DRD', 'DRDB', 'DRDBU', 'DRDBW', 'DRH', 'DRI', 'DRIO', 'DRMA', 'DRMAW', 'DRRX', 'DRS', 'DRTS', 'DRTSW', 'DRUG', 'DRVN', 'DSGN', 'DSGR', 'DSGX', 'DSP', 'DSWL', 'DSX', 'DSY', 'DSYWW', 'DT', 'DTB', 'DTC', 'DTCK', 'DTE', 'DTG', 'DTIL', 'DTM', 'DTSQ', 'DTSQR', 'DTSQU', 'DTSS', 'DTST', 'DTSTW', 'DTW', 'DUK', 'DUKB', 'DUO', 'DUOL', 'DUOT', 'DV', 'DVA', 'DVAX', 'DVN', 'DVQQ', 'DWSN', 'DWTX', 'DX', 'DXC', 'DXCM', 'DXF', 'DXLG', 'DXPE', 'DXR', 'DXST', 'DXYZ', 'DY', 'DYAI', 'DYCQ', 'DYCQR', 'DYCQU', 'DYN', 'DYNT', 'DYNX', 'DYNXU', 'DYNXW', 'DZSI', 'E', 'EA', 'EAF', 'EAI', 'EARN', 'EAT', 'EB', 'EBAY', 'EBC', 'EBF', 'EBMT', 'EBON', 'EBR', 'EBS', 'EBTC', 'EC', 'ECAT', 'ECBK', 'ECCC', 'ECCU', 'ECCV', 'ECCW', 'ECCX', 'ECDA', 'ECDAW', 'ECG', 'ECL', 'ECO', 'ECOR', 'ECPG', 'ECVT', 'ECX', 'ECXWW', 'ED', 'EDAP', 'EDBL', 'EDBLW', 'EDIT', 'EDN', 'EDR', 'EDRY', 'EDSA', 'EDTK', 'EDU', 'EDUC', 'EE', 'EEFT', 'EEIQ', 'EEX', 'EFC', 'EFOI', 'EFSC', 'EFSCP', 'EFTR', 'EFX', 'EFXT', 'EG', 'EGAN', 'EGBN', 'EGHT', 'EGIOQ', 'EGO', 'EGOXF', 'EGP', 'EGY', 'EH', 'EHAB', 'EHC', 'EHGO', 'EHTH', 'EIC', 'EICA', 'EICB', 'EIG', 'EIX', 'EJH', 'EKSO', 'EL', 'ELAB', 'ELAN', 'ELBM', 'ELC', 'ELDN', 'ELEV', 'ELF', 'ELME', 'ELP', 'ELPC', 'ELPW', 'ELS', 'ELSE', 'ELTK', 'ELTX', 'ELUT', 'ELV', 'ELVA', 'ELVN', 'ELWS', 'EM', 'EMBC', 'EMCG', 'EMCGR', 'EMCGU', 'EMCGW', 'EME', 'EMKR', 'EML', 'EMN', 'EMP', 'EMR', 'ENB', 'ENCP', 'ENFN', 'ENFY', 'ENGN', 'ENGNW', 'ENIC', 'ENJ', 'ENLT', 'ENLV', 'ENO', 'ENOV', 'ENPH', 'ENR', 'ENS', 'ENSC', 'ENSG', 'ENTA', 'ENTG', 'ENTO', 'ENTX', 'ENVA', 'ENVB', 'ENVX', 'ENZ', 'EOG', 'EOLS', 'EOSE', 'EOSEW', 'EPAC', 'EPAM', 'EPC', 'EPD', 'EPIX', 'EPOW', 'EPR', 'EPRT', 'EPSN', 'EQ', 'EQBK', 'EQC', 'EQH', 'EQIX', 'EQNR', 'EQR', 'EQS', 'EQT', 'EQV', 'ERAS', 'ERIC', 'ERIE', 'ERII', 'ERJ', 'ERNA', 'ERO', 'ES', 'ESAB', 'ESCA', 'ESE', 'ESEA', 'ESGLW', 'ESGR', 'ESGRO', 'ESGRP', 'ESHA', 'ESHAR', 'ESI', 'ESLA', 'ESLAW', 'ESLT', 'ESNT', 'ESOA', 'ESPR', 'ESQ', 'ESRT', 'ESS', 'ESSA', 'ESTA', 'ESTC', 'ET', 'ETD', 'ETN', 'ETNB', 'ETON', 'ETR', 'ETSY', 'ETWO', 'EUDA', 'EUDAW', 'EURK', 'EURKR', 'EURKU', 'EVAX', 'EVC', 'EVCM', 'EVER', 'EVEX', 'EVGN', 'EVGO', 'EVGOW', 'EVGR', 'EVGRU', 'EVGRW', 'EVH', 'EVLV', 'EVLVW', 'EVO', 'EVOK', 'EVR', 'EVRG', 'EVRI', 'EVTC', 'EVTL', 'EVTV', 'EW', 'EWBC', 'EWCZ', 'EWTX', 'EXAS', 'EXC', 'EXE', 'EXEEL', 'EXEEW', 'EXEEZ', 'EXEL', 'EXFY', 'EXK', 'EXLS', 'EXP', 'EXPD', 'EXPE', 'EXPI', 'EXPO', 'EXR', 'EXTR', 'EYE', 'EYEN', 'EYPT', 'EZFL', 'EZGO', 'EZPW', 'F', 'FA', 'FAAS', 'FAASW', 'FACT', 'FACTU', 'FACTW', 'FAF', 'FAMI', 'FANG', 'FARM', 'FARO', 'FAST', 'FAT', 'FATBB', 'FATBP', 'FATBW', 'FATE', 'FBIN', 'FBIO', 'FBIOP', 'FBIZ', 'FBK', 'FBLA', 'FBLG', 'FBMS', 'FBNC', 'FBP', 'FBRT', 'FBRX', 'FBYD', 'FBYDW', 'FC', 'FCAP', 'FCBC', 'FCCO', 'FCEL', 'FCF', 'FCFS', 'FCN', 'FCNCA', 'FCNCO', 'FCNCP', 'FCPT', 'FCRX', 'FCUV', 'FCX', 'FDBC', 'FDMT', 'FDP', 'FDS', 'FDSB', 'FDUS', 'FDX', 'FE', 'FEAM', 'FEAT', 'FEBO', 'FEDU', 'FEIM', 'FELE', 'FEMY', 'FENC', 'FENG', 'FERG', 'FET', 'FF', 'FFBC', 'FFIC', 'FFIE', 'FFIEW', 'FFIN', 'FFIV', 'FFNW', 'FFWM', 'FG', 'FGBI', 'FGBIP', 'FGEN', 'FGF', 'FGFPP', 'FGI', 'FGIWW', 'FGL', 'FGMCU', 'FGN', 'FGSN', 'FHB', 'FHI', 'FHN', 'FHTX', 'FI', 'FIBK', 'FICO', 'FIGS', 'FIHL', 'FINS', 'FINV', 'FINW', 'FIP', 'FIS', 'FISI', 'FITB', 'FITBI', 'FITBO', 'FITBP', 'FIVE', 'FIVN', 'FIVY', 'FIX', 'FIZZ', 'FKWL', 'FL', 'FLDD', 'FLDDU', 'FLDDW', 'FLEX', 'FLG', 'FLGC', 'FLGT', 'FLIC', 'FLL', 'FLNC', 'FLNG', 'FLNT', 'FLO', 'FLOC', 'FLR', 'FLS', 'FLUX', 'FLWS', 'FLX', 'FLXS', 'FLYE', 'FLYW', 'FLYX', 'FMAO', 'FMBH', 'FMC', 'FMNB', 'FMS', 'FMST', 'FMSTW', 'FMTO', 'FMX', 'FN', 'FNA', 'FNB', 'FND', 'FNF', 'FNGR', 'FNKO', 'FNLC', 'FNV', 'FNWB', 'FNWD', 'FOA', 'FOLD', 'FONR', 'FOR', 'FORA', 'FORD', 'FORLU', 'FORLW', 'FORM', 'FORR', 'FORTY', 'FOSL', 'FOSLL', 'FOUR', 'FOX', 'FOXA', 'FOXF', 'FOXX', 'FOXXW', 'FPAY', 'FPH', 'FPI', 'FR', 'FRAF', 'FRBA', 'FREY', 'FRGE', 'FRGT', 'FRHC', 'FRME', 'FRMEP', 'FRO', 'FROG', 'FRPH', 'FRPT', 'FRSH', 'FRST', 'FRSX', 'FRT', 'FSBC', 'FSBW', 'FSCO', 'FSEA', 'FSFG', 'FSHP', 'FSHPR', 'FSHPU', 'FSK', 'FSLR', 'FSLY', 'FSM', 'FSNB', 'FSS', 'FSTR', 'FSV', 'FTAI', 'FTAIM', 'FTAIN', 'FTAIO', 'FTCI', 'FTDR', 'FTEK', 'FTEL', 'FTFT', 'FTHM', 'FTHY', 'FTI', 'FTII', 'FTIIU', 'FTIIW', 'FTK', 'FTLF', 'FTNT', 'FTRE', 'FTS', 'FTV', 'FUBO', 'FUFU', 'FUFUW', 'FUL', 'FULC', 'FULT', 'FULTP', 'FUN', 'FUNC', 'FUND', 'FUSB', 'FUTU', 'FVCB', 'FVN', 'FVNNR', 'FVNNU', 'FVR', 'FVRR', 'FWONA', 'FWONK', 'FWRD', 'FWRG', 'FXNC', 'FYBR', 'G', 'GABC', 'GAIA', 'GAIN', 'GAINI', 'GAINL', 'GAINN', 'GAINZ', 'GALT', 'GAMB', 'GAME', 'GAN', 'GANX', 'GAP', 'GASS', 'GATE', 'GATEU', 'GATEW', 'GATX', 'GAUZ', 'GB', 'GBBK', 'GBBKR', 'GBBKW', 'GBCI', 'GBDC', 'GBIO', 'GBLI', 'GBNY', 'GBTG', 'GBX', 'GCBC', 'GCI', 'GCMG', 'GCMGW', 'GCO', 'GCT', 'GCTK', 'GCTS', 'GD', 'GDC', 'GDDY', 'GDEN', 'GDEV', 'GDEVW', 'GDHG', 'GDOT', 'GDRX', 'GDS', 'GDST', 'GDSTR', 'GDSTU', 'GDSTW', 'GDTC', 'GDYN', 'GE', 'GECC', 'GECCH', 'GECCI', 'GECCO', 'GECCZ', 'GEF', 'GEG', 'GEGGL', 'GEHC', 'GEL', 'GELS', 'GEN', 'GENE', 'GENI', 'GENK', 'GEO', 'GEOS', 'GERN', 'GES', 'GETY', 'GEV', 'GEVO', 'GFAI', 'GFAIW', 'GFF', 'GFI', 'GFL', 'GFR', 'GFS', 'GGAL', 'GGB', 'GGG', 'GGR', 'GGROW', 'GH', 'GHC', 'GHG', 'GHI', 'GHLD', 'GHM', 'GHRS', 'GIB', 'GIC', 'GIFI', 'GIFT', 'GIG', 'GIGGU', 'GIGGW', 'GIGM', 'GIII', 'GIL', 'GILD', 'GILT', 'GIPR', 'GIPRW', 'GIS', 'GITS', 'GJH', 'GJO', 'GJP', 'GJR', 'GJS', 'GJT', 'GKOS', 'GL', 'GLAC', 'GLACR', 'GLACU', 'GLAD', 'GLADZ', 'GLBE', 'GLBS', 'GLBZ', 'GLDD', 'GLE', 'GLLI', 'GLLIR', 'GLLIU', 'GLLIW', 'GLMD', 'GLNG', 'GLOB', 'GLP', 'GLPG', 'GLPI', 'GLRE', 'GLSI', 'GLST', 'GLSTR', 'GLSTU', 'GLSTW', 'GLTO', 'GLUE', 'GLW', 'GLXG', 'GLYC', 'GM', 'GMAB', 'GME', 'GMED', 'GMGI', 'GMGT', 'GMHS', 'GMM', 'GMRE', 'GMS', 'GNE', 'GNFT', 'GNK', 'GNL', 'GNLN', 'GNLX', 'GNPX', 'GNRC', 'GNSS', 'GNTA', 'GNTX', 'GNTY', 'GNW', 'GO', 'GOCO', 'GOGL', 'GOGO', 'GOLD', 'GOLF', 'GOLLQ', 'GOOD', 'GOODN', 'GOODO', 'GOOG', 'GOOGL', 'GOOS', 'GORV', 'GOSS', 'GOTU', 'GOVX', 'GOVXW', 'GP', 'GPAT', 'GPATU', 'GPATW', 'GPC', 'GPCR', 'GPI', 'GPJA', 'GPK', 'GPMT', 'GPN', 'GPOR', 'GPRE', 'GPRK', 'GPRO', 'GRAB', 'GRABW', 'GRAL', 'GRBK', 'GRC', 'GRCE', 'GRDN', 'GREE', 'GREEL', 'GRFS', 'GRI', 'GRMN', 'GRND', 'GRNQ', 'GRNT', 'GRO', 'GROM', 'GROMW', 'GROV', 'GROW', 'GRPN', 'GRRR', 'GRRRW', 'GRVY', 'GRWG', 'GRYP', 'GS', 'GSBC', 'GSBD', 'GSHD', 'GSIT', 'GSIW', 'GSK', 'GSL', 'GSM', 'GSMGW', 'GSRT', 'GSRTR', 'GSRTU', 'GSUN', 'GT', 'GTBP', 'GTEC', 'GTES', 'GTIM', 'GTLB', 'GTLS', 'GTN', 'GTX', 'GTY', 'GUG', 'GURE', 'GUTS', 'GV', 'GVA', 'GVH', 'GWAV', 'GWH', 'GWRE', 'GWRS', 'GWW', 'GXAI', 'GXO', 'GYRE', 'GYRO', 'H', 'HAE', 'HAFC', 'HAFN', 'HAIN', 'HAL', 'HALO', 'HAO', 'HAS', 'HASI', 'HAYW', 'HBAN', 'HBANL', 'HBANM', 'HBANP', 'HBB', 'HBCP', 'HBI', 'HBIO', 'HBM', 'HBNC', 'HBT', 'HCA', 'HCAI', 'HCAT', 'HCC', 'HCI', 'HCKT', 'HCM', 'HCP', 'HCSG', 'HCTI', 'HCVI', 'HCVIU', 'HCVIW', 'HCWB', 'HCXY', 'HD', 'HDB', 'HDL', 'HDSN', 'HE', 'HEES', 'HEI', 'HELE', 'HEPA', 'HEPS', 'HES', 'HESM', 'HFBL', 'HFFG', 'HFWA', 'HG', 'HGAS', 'HGASW', 'HGBL', 'HGLB', 'HGTY', 'HGV', 'HHH', 'HHS', 'HI', 'HIFS', 'HIG', 'HIHO', 'HII', 'HIMS', 'HIMX', 'HIPO', 'HIT', 'HITI', 'HIVE', 'HIW', 'HKD', 'HKIT', 'HKPD', 'HL', 'HLF', 'HLI', 'HLIO', 'HLIT', 'HLLY', 'HLMN', 'HLN', 'HLNE', 'HLP', 'HLT', 'HLVX', 'HLX', 'HLXB', 'HMC', 'HMN', 'HMST', 'HMY', 'HNI', 'HNNA', 'HNNAZ', 'HNRG', 'HNST', 'HNVR', 'HOFT', 'HOFV', 'HOFVW', 'HOG', 'HOLO', 'HOLOW', 'HOLX', 'HOMB', 'HON', 'HOND', 'HONDU', 'HONDW', 'HONE', 'HOOD', 'HOOK', 'HOPE', 'HOTH', 'HOUR', 'HOUS', 'HOV', 'HOVNP', 'HOVR', 'HOVRW', 'HOWL', 'HP', 'HPAI', 'HPAIW', 'HPE', 'HPH', 'HPK', 'HPKEW', 'HPP', 'HPQ', 'HQI', 'HQY', 'HR', 'HRB', 'HRI', 'HRL', 'HRMY', 'HROW', 'HROWL', 'HROWM', 'HRTG', 'HRTX', 'HRZN', 'HSAI', 'HSBC', 'HSCS', 'HSCSW', 'HSDT', 'HSHP', 'HSIC', 'HSII', 'HSON', 'HSPO', 'HSPOR', 'HSPOU', 'HSPOW', 'HSPT', 'HSPTR', 'HSPTU', 'HST', 'HSTM', 'HSY', 'HTBI', 'HTBK', 'HTCO', 'HTCR', 'HTFB', 'HTFC', 'HTGC', 'HTH', 'HTHT', 'HTLD', 'HTLM', 'HTOO', 'HTOOW', 'HTZ', 'HTZWW', 'HUBB', 'HUBC', 'HUBCW', 'HUBCZ', 'HUBG', 'HUBS', 'HUDI', 'HUHU', 'HUIZ', 'HUM', 'HUMA', 'HUMAW', 'HUN', 'HURA', 'HURC', 'HURN', 'HUT', 'HUYA', 'HVIIU', 'HVT', 'HWBK', 'HWC', 'HWCPZ', 'HWH', 'HWKN', 'HWM', 'HXL', 'HY', 'HYAC', 'HYFM', 'HYLN', 'HYMC', 'HYMCL', 'HYMCW', 'HYPR', 'HYZN', 'HZO', 'IAC', 'IAG', 'IART', 'IAS', 'IBAC', 'IBACR', 'IBCP', 'IBEX', 'IBG', 'IBKR', 'IBM', 'IBN', 'IBOC', 'IBP', 'IBRX', 'IBTA', 'ICAD', 'ICCC', 'ICCH', 'ICCM', 'ICCT', 'ICE', 'ICFI', 'ICG', 'ICHR', 'ICL', 'ICLK', 'ICLR', 'ICMB', 'ICON', 'ICU', 'ICUCW', 'ICUI', 'IDA', 'IDAI', 'IDCC', 'IDN', 'IDT', 'IDXX', 'IDYA', 'IEP', 'IESC', 'IEX', 'IFBD', 'IFF', 'IFRX', 'IFS', 'IGIC', 'IGMS', 'IGT', 'IGTA', 'IGTAR', 'IGTAU', 'IGTAW', 'IH', 'IHG', 'IHRT', 'IHS', 'III', 'IIIN', 'IIIV', 'IINN', 'IINNW', 'IIPR', 'IKNA', 'IKT', 'ILAG', 'ILLR', 'ILLRW', 'ILMN', 'ILPT', 'IMAB', 'IMAQ', 'IMAQR', 'IMAQU', 'IMAQW', 'IMAX', 'IMCC', 'IMCR', 'IMG', 'IMKTA', 'IMMP', 'IMMR', 'IMMX', 'IMNM', 'IMNN', 'IMOS', 'IMPP', 'IMPPP', 'IMRN', 'IMRX', 'IMTE', 'IMTX', 'IMTXW', 'IMUX', 'IMVT', 'IMXI', 'INAB', 'INBK', 'INBKZ', 'INBS', 'INBX', 'INCR', 'INCY', 'INDB', 'INDI', 'INDP', 'INDV', 'INFA', 'INFN', 'INFY', 'ING', 'INGM', 'INGN', 'INGR', 'INHD', 'INKT', 'INLF', 'INM', 'INMB', 'INMD', 'INN', 'INNV', 'INO', 'INOD', 'INR', 'INSE', 'INSG', 'INSM', 'INSP', 'INSW', 'INTA', 'INTC', 'INTE', 'INTEU', 'INTEW', 'INTG', 'INTJ', 'INTR', 'INTS', 'INTU', 'INTZ', 'INV', 'INVA', 'INVE', 'INVH', 'INVN', 'INVX', 'INVZ', 'INVZW', 'INZY', 'IOBT', 'IOMT', 'IONQ', 'IONR', 'IONS', 'IOSP', 'IOT', 'IOVA', 'IP', 'IPA', 'IPAR', 'IPDN', 'IPG', 'IPGP', 'IPHA', 'IPI', 'IPM', 'IPSC', 'IPW', 'IPWR', 'IPX', 'IPXX', 'IPXXU', 'IPXXW', 'IQ', 'IQV', 'IR', 'IRBT', 'IRD', 'IRDM', 'IREN', 'IRIX', 'IRM', 'IRMD', 'IROH', 'IROHR', 'IROHU', 'IROHW', 'IRON', 'IROQ', 'IRS', 'IRT', 'IRTC', 'IRWD', 'ISPC', 'ISPO', 'ISPOW', 'ISPR', 'ISRG', 'ISRL', 'ISRLU', 'ISRLW', 'ISSC', 'ISTR', 'IT', 'ITCI', 'ITGR', 'ITIC', 'ITOS', 'ITRI', 'ITRM', 'ITRN', 'ITT', 'ITUB', 'ITW', 'IVA', 'IVAC', 'IVCA', 'IVCAU', 'IVCAW', 'IVDA', 'IVDAW', 'IVP', 'IVR', 'IVT', 'IVVD', 'IVZ', 'IX', 'IXAQF', 'IXHL', 'IXQUF', 'IXQWF', 'IZEA', 'IZM', 'IZTC', 'J', 'JACK', 'JACS', 'JAGX', 'JAKK', 'JAMF', 'JANX', 'JAZZ', 'JBDI', 'JBGS', 'JBHT', 'JBI', 'JBK', 'JBL', 'JBLU', 'JBSS', 'JBTM', 'JCI', 'JCSE', 'JCTC', 'JD', 'JDZG', 'JEF', 'JELD', 'JFBR', 'JFBRW', 'JFIN', 'JFU', 'JG', 'JHG', 'JHX', 'JILL', 'JJSF', 'JKHY', 'JKS', 'JL', 'JLL', 'JMIA', 'JMSB', 'JNJ', 'JNPR', 'JNVR', 'JOBY', 'JOE', 'JOUT', 'JPM', 'JRSH', 'JRVR', 'JSM', 'JSPR', 'JSPRW', 'JTAI', 'JUNE', 'JUNS', 'JVA', 'JVSA', 'JVSAR', 'JVSAU', 'JWEL', 'JWN', 'JXG', 'JXN', 'JYD', 'JYNT', 'JZ', 'JZXN', 'K', 'KAI', 'KALA', 'KALU', 'KALV', 'KANT', 'KAR', 'KARO', 'KAVL', 'KB', 'KBDC', 'KBH', 'KBNTW', 'KBR', 'KBSX', 'KC', 'KD', 'KDLY', 'KDLYW', 'KDP', 'KE', 'KELYA', 'KELYB', 'KEN', 'KEP', 'KEQU', 'KEX', 'KEY', 'KEYS', 'KFFB', 'KFIIU', 'KFRC', 'KFS', 'KFY', 'KGC', 'KGEI', 'KGS', 'KHC', 'KIDS', 'KIM', 'KIND', 'KINS', 'KIRK', 'KITT', 'KITTW', 'KKR', 'KKRS', 'KLAC', 'KLC', 'KLG', 'KLIC', 'KLTO', 'KLTOW', 'KLTR', 'KLXE', 'KMB', 'KMDA', 'KMI', 'KMPB', 'KMPR', 'KMT', 'KMX', 'KN', 'KNDI', 'KNF', 'KNOP', 'KNSA', 'KNSL', 'KNTK', 'KNX', 'KO', 'KOD', 'KODK', 'KOF', 'KOP', 'KOPN', 'KORE', 'KOS', 'KOSS', 'KPLT', 'KPLTW', 'KPRX', 'KPTI', 'KR', 'KRBP', 'KRC', 'KREF', 'KRG', 'KRKR', 'KRMD', 'KRNT', 'KRNY', 'KRO', 'KRON', 'KROS', 'KRP', 'KRRO', 'KRT', 'KRUS', 'KRYS', 'KSCP', 'KSPI', 'KSS', 'KT', 'KTB', 'KTCC', 'KTH', 'KTN', 'KTOS', 'KTTA', 'KTTAW', 'KUKE', 'KURA', 'KVAC', 'KVACU', 'KVACW', 'KVHI', 'KVUE', 'KVYO', 'KW', 'KWE', 'KWESW', 'KWR', 'KXIN', 'KYMR', 'KYTX', 'KZIA', 'KZR', 'L', 'LAB', 'LAC', 'LAD', 'LADR', 'LAES', 'LAKE', 'LAMR', 'LANC', 'LAND', 'LANDM', 'LANDO', 'LANDP', 'LANV', 'LAR', 'LARK', 'LASE', 'LASR', 'LAUR', 'LAW', 'LAZ', 'LAZR', 'LB', 'LBGJ', 'LBRDA', 'LBRDK', 'LBRDP', 'LBRT', 'LBTYA', 'LBTYB', 'LBTYK', 'LC', 'LCFY', 'LCFYW', 'LCID', 'LCII', 'LCNB', 'LCUT', 'LDI', 'LDOS', 'LDRH', 'LDTC', 'LDTCW', 'LDWY', 'LE', 'LEA', 'LECO', 'LEDS', 'LEE', 'LEG', 'LEGH', 'LEGN', 'LEJUY', 'LEN', 'LENZ', 'LESL', 'LEVI', 'LEXX', 'LEXXW', 'LFCR', 'LFMD', 'LFMDP', 'LFST', 'LFT', 'LFUS', 'LFVN', 'LFWD', 'LGCB', 'LGCL', 'LGHL', 'LGHLW', 'LGIH', 'LGMK', 'LGND', 'LGO', 'LGTY', 'LGVN', 'LH', 'LHX', 'LI', 'LICN', 'LICY', 'LIDR', 'LIDRW', 'LIEN', 'LIF', 'LII', 'LILA', 'LILAK', 'LIN', 'LINC', 'LIND', 'LINE', 'LINK', 'LION', 'LIPO', 'LIQT', 'LITB', 'LITE', 'LITM', 'LIVE', 'LIVN', 'LIXT', 'LIXTW', 'LKCO', 'LKFN', 'LKQ', 'LLY', 'LLYVA', 'LLYVK', 'LMAT', 'LMB', 'LMFA', 'LMND', 'LMNR', 'LMT', 'LNC', 'LND', 'LNKB', 'LNKS', 'LNN', 'LNSR', 'LNT', 'LNTH', 'LNW', 'LNZA', 'LNZAW', 'LOAN', 'LOAR', 'LOB', 'LOBO', 'LOCL', 'LOCO', 'LOGC', 'LOGI', 'LOMA', 'LOOP', 'LOPE', 'LOT', 'LOTWW', 'LOVE', 'LOW', 'LPAA', 'LPAAU', 'LPAAW', 'LPBB', 'LPBBU', 'LPBBW', 'LPCN', 'LPG', 'LPL', 'LPLA', 'LPRO', 'LPSN', 'LPTH', 'LPTX', 'LPX', 'LQDA', 'LQDT', 'LRCX', 'LRE', 'LRFC', 'LRHC', 'LRMR', 'LRN', 'LSAK', 'LSB', 'LSBK', 'LSBPW', 'LSCC', 'LSDIF', 'LSE', 'LSEA', 'LSEAW', 'LSH', 'LSPD', 'LST', 'LSTA', 'LSTR', 'LTBR', 'LTC', 'LTCH', 'LTCHW', 'LTH', 'LTM', 'LTRN', 'LTRPA', 'LTRPB', 'LTRX', 'LTRY', 'LTRYW', 'LU', 'LUCD', 'LUCK', 'LUCY', 'LUCYW', 'LULU', 'LUMN', 'LUNG', 'LUNR', 'LUNRW', 'LUV', 'LVLU', 'LVO', 'LVRO', 'LVROW', 'LVS', 'LVTX', 'LVWR', 'LW', 'LWAY', 'LWLG', 'LX', 'LXEH', 'LXEO', 'LXFR', 'LXP', 'LXRX', 'LXU', 'LYB', 'LYEL', 'LYFT', 'LYG', 'LYRA', 'LYT', 'LYTS', 'LYV', 'LZ', 'LZB', 'LZM', 'M', 'MA', 'MAA', 'MAC', 'MACI', 'MACIU', 'MACIW', 'MAGN', 'MAIN', 'MAMA', 'MAMO', 'MAN', 'MANH', 'MANU', 'MAPS', 'MAPSW', 'MAQC', 'MAR', 'MARA', 'MARK', 'MARPS', 'MAS', 'MASI', 'MASK', 'MASS', 'MAT', 'MATH', 'MATV', 'MATW', 'MATX', 'MAX', 'MAXN', 'MAYS', 'MAZE', 'MBAV', 'MBAVU', 'MBAVW', 'MBAY', 'MBC', 'MBCN', 'MBI', 'MBIN', 'MBINM', 'MBINN', 'MBIO', 'MBLY', 'MBNKP', 'MBOT', 'MBRX', 'MBUU', 'MBWM', 'MBX', 'MC', 'MCAA', 'MCAAU', 'MCAAW', 'MCAG', 'MCAGR', 'MCAGU', 'MCB', 'MCBS', 'MCD', 'MCFT', 'MCHP', 'MCHX', 'MCK', 'MCO', 'MCOM', 'MCOMW', 'MCRB', 'MCRI', 'MCS', 'MCTR', 'MCVT', 'MCW', 'MCY', 'MD', 'MDAI', 'MDAIW', 'MDB', 'MDBH', 'MDCXW', 'MDGL', 'MDIA', 'MDLZ', 'MDRR', 'MDRX', 'MDT', 'MDU', 'MDV', 'MDVLQ', 'MDWD', 'MDXG', 'MDXH', 'ME', 'MEC', 'MED', 'MEDP', 'MEG', 'MEGI', 'MEGL', 'MEI', 'MEIP', 'MELI', 'MEOH', 'MERC', 'MESA', 'MESO', 'MET', 'META', 'METC', 'METCB', 'METCL', 'METCZ', 'MFA', 'MFAN', 'MFAO', 'MFC', 'MFG', 'MFH', 'MFI', 'MFIC', 'MFICL', 'MFIN', 'MFSB', 'MFSG', 'MFSI', 'MFSM', 'MFSV', 'MG', 'MGA', 'MGAM', 'MGEE', 'MGIC', 'MGIH', 'MGM', 'MGNI', 'MGNX', 'MGOL', 'MGPI', 'MGR', 'MGRB', 'MGRC', 'MGRD', 'MGRE', 'MGRM', 'MGRX', 'MGTX', 'MGX', 'MGY', 'MGYR', 'MHK', 'MHLA', 'MHLD', 'MHNC', 'MHO', 'MHUA', 'MIDD', 'MIGI', 'MIMI', 'MIND', 'MINM', 'MIO', 'MIR', 'MIRA', 'MIRM', 'MIST', 'MITA', 'MITAU', 'MITAW', 'MITK', 'MITN', 'MITP', 'MITT', 'MIXT', 'MKC', 'MKDW', 'MKDWW', 'MKFG', 'MKL', 'MKSI', 'MKTW', 'MKTX', 'ML', 'MLAB', 'MLAC', 'MLACR', 'MLACU', 'MLCO', 'MLEC', 'MLECW', 'MLGO', 'MLI', 'MLKN', 'MLM', 'MLNK', 'MLP', 'MLR', 'MLTX', 'MLYS', 'MMC', 'MMI', 'MMLP', 'MMM', 'MMS', 'MMSI', 'MMYT', 'MNDO', 'MNDR', 'MNDY', 'MNKD', 'MNMD', 'MNOV', 'MNPR', 'MNR', 'MNRO', 'MNSB', 'MNSBP', 'MNSO', 'MNST', 'MNTK', 'MNTS', 'MNTSW', 'MNY', 'MNYWW', 'MO', 'MOB', 'MOBBW', 'MOBQW', 'MOBX', 'MOBXW', 'MOD', 'MODD', 'MODG', 'MODV', 'MOFG', 'MOGO', 'MOGU', 'MOH', 'MOLN', 'MOMO', 'MOR', 'MORN', 'MOS', 'MOV', 'MOVE', 'MP', 'MPAA', 'MPB', 'MPC', 'MPLN', 'MPLNW', 'MPLX', 'MPW', 'MPWR', 'MPX', 'MQ', 'MRAI', 'MRAM', 'MRBK', 'MRC', 'MRCC', 'MRCY', 'MREO', 'MRIN', 'MRK', 'MRKR', 'MRM', 'MRNA', 'MRNO', 'MRNOW', 'MRNS', 'MRSN', 'MRT', 'MRTN', 'MRUS', 'MRVI', 'MRVL', 'MRX', 'MS', 'MSA', 'MSAI', 'MSAIW', 'MSB', 'MSBI', 'MSBIP', 'MSC', 'MSCI', 'MSDL', 'MSEX', 'MSFT', 'MSGE', 'MSGM', 'MSGS', 'MSI', 'MSIF', 'MSM', 'MSPR', 'MSPRW', 'MSPRZ', 'MSS', 'MSSA', 'MSSAR', 'MSSAU', 'MSSAW', 'MSTR', 'MSW', 'MT', 'MTAL', 'MTB', 'MTBLY', 'MTC', 'MTCH', 'MTD', 'MTDR', 'MTEK', 'MTEKW', 'MTEN', 'MTEST', 'MTEX', 'MTG', 'MTH', 'MTLS', 'MTN', 'MTR', 'MTRN', 'MTRX', 'MTSI', 'MTSR', 'MTTR', 'MTUS', 'MTVA', 'MTW', 'MTX', 'MTZ', 'MU', 'MUFG', 'MULL', 'MULN', 'MUR', 'MURA', 'MUSA', 'MUSE', 'MUX', 'MVBF', 'MVIS', 'MVO', 'MVRK', 'MVST', 'MVSTW', 'MWA', 'MX', 'MXCT', 'MXL', 'MYE', 'MYFW', 'MYGN', 'MYNA', 'MYNZ', 'MYPS', 'MYPSW', 'MYRG', 'MYSZ', 'MYTE', 'NA', 'NAAS', 'NABL', 'NAII', 'NAMI', 'NAMS', 'NAMSW', 'NAOV', 'NARI', 'NAT', 'NATH', 'NATL', 'NATR', 'NAUT', 'NAVI', 'NAYA', 'NB', 'NBBK', 'NBHC', 'NBIS', 'NBIX', 'NBN', 'NBR', 'NBSTU', 'NBSTW', 'NBTB', 'NBTX', 'NBXG', 'NC', 'NCDL', 'NCEW', 'NCI', 'NCLH', 'NCMI', 'NCNA', 'NCNO', 'NCPL', 'NCPLW', 'NCRA', 'NCSM', 'NCTY', 'NDAQ', 'NDLS', 'NDMO', 'NDRA', 'NDSN', 'NE', 'NECB', 'NEE', 'NEEPN', 'NEGG', 'NEHC', 'NEHCW', 'NEM', 'NEO', 'NEOG', 'NEON', 'NEOV', 'NEOVW', 'NEPH', 'NERV', 'NESR', 'NESRW', 'NET', 'NETD', 'NETDU', 'NETDW', 'NEU', 'NEUE', 'NEUP', 'NEWT', 'NEWTG', 'NEWTH', 'NEWTI', 'NEWTZ', 'NEXA', 'NEXN', 'NEXT', 'NFBK', 'NFE', 'NFG', 'NFLX', 'NGG', 'NGL', 'NGNE', 'NGS', 'NGVC', 'NGVT', 'NHI', 'NHPAP', 'NHPBP', 'NHTC', 'NI', 'NIC', 'NICE', 'NINE', 'NIO', 'NIOBW', 'NIPG', 'NISN', 'NITO', 'NIU', 'NIVF', 'NIVFW', 'NIXX', 'NIXXW', 'NJR', 'NKE', 'NKGN', 'NKGNW', 'NKLA', 'NKSH', 'NKTR', 'NKTX', 'NL', 'NLOP', 'NLSP', 'NLSPW', 'NLY', 'NMAI', 'NMCO', 'NMFC', 'NMFCZ', 'NMG', 'NMHI', 'NMHIW', 'NMIH', 'NMKBP', 'NMM', 'NMR', 'NMRA', 'NMRK', 'NMTC', 'NN', 'NNAVW', 'NNBR', 'NNDM', 'NNE', 'NNI', 'NNN', 'NNOX', 'NOA', 'NOAH', 'NOC', 'NODK', 'NOEM', 'NOEMR', 'NOEMU', 'NOEMW', 'NOG', 'NOK', 'NOMD', 'NOTE', 'NOTV', 'NOV', 'NOVA', 'NOVT', 'NOW', 'NPAB', 'NPABU', 'NPABW', 'NPCE', 'NPCT', 'NPFD', 'NPK', 'NPKI', 'NPO', 'NPWR', 'NRC', 'NRDS', 'NRDY', 'NREF', 'NRG', 'NRGV', 'NRIM', 'NRIX', 'NRP', 'NRSN', 'NRSNW', 'NRT', 'NRUC', 'NRXP', 'NRXPW', 'NSA', 'NSC', 'NSIT', 'NSP', 'NSPR', 'NSSC', 'NSTS', 'NSYS', 'NTAP', 'NTB', 'NTCL', 'NTCT', 'NTES', 'NTEST', 'NTGR', 'NTIC', 'NTLA', 'NTNX', 'NTR', 'NTRA', 'NTRB', 'NTRBW', 'NTRP', 'NTRS', 'NTRSO', 'NTST', 'NTWK', 'NTWO', 'NTWOU', 'NTWOW', 'NTZ', 'NU', 'NUE', 'NUKK', 'NUKKW', 'NURO', 'NUS', 'NUTX', 'NUVB', 'NUVL', 'NUVOQ', 'NUVWQ', 'NUWE', 'NVAWW', 'NVAX', 'NVCR', 'NVCT', 'NVDA', 'NVDG', 'NVEC', 'NVEE', 'NVFY', 'NVGS', 'NVMI', 'NVNI', 'NVNIW', 'NVNO', 'NVO', 'NVR', 'NVRI', 'NVRO', 'NVS', 'NVST', 'NVT', 'NVTS', 'NVVE', 'NVVEW', 'NVX', 'NWBI', 'NWE', 'NWFL', 'NWG', 'NWGL', 'NWL', 'NWN', 'NWPX', 'NWS', 'NWSA', 'NWTN', 'NWTNW', 'NX', 'NXDT', 'NXE', 'NXG', 'NXGL', 'NXGLW', 'NXL', 'NXLIW', 'NXPI', 'NXPL', 'NXPLW', 'NXRT', 'NXST', 'NXT', 'NXTC', 'NXTT', 'NXU', 'NYAX', 'NYC', 'NYMT', 'NYMTG', 'NYMTI', 'NYMTL', 'NYMTM', 'NYMTN', 'NYMTZ', 'NYT', 'NYXH', 'O', 'OABI', 'OABIW', 'OACC', 'OACCU', 'OACCW', 'OAKU', 'OAKUR', 'OAKUU', 'OAKUW', 'OB', 'OBDC', 'OBIO', 'OBK', 'OBLG', 'OBT', 'OC', 'OCC', 'OCCI', 'OCCIN', 'OCCIO', 'OCEA', 'OCEAW', 'OCFC', 'OCFCP', 'OCFT', 'OCG', 'OCGN', 'OCS', 'OCSAW', 'OCSL', 'OCTO', 'OCUL', 'OCX', 'ODC', 'ODD', 'ODFL', 'ODP', 'ODV', 'ODVWZ', 'OEC', 'OESX', 'OFG', 'OFIX', 'OFLX', 'OFS', 'OFSSH', 'OGE', 'OGI', 'OGN', 'OGS', 'OHI', 'OI', 'OII', 'OIS', 'OKE', 'OKLO', 'OKTA', 'OKUR', 'OKYO', 'OLB', 'OLED', 'OLLI', 'OLMA', 'OLN', 'OLO', 'OLP', 'OLPX', 'OM', 'OMAB', 'OMC', 'OMCC', 'OMCL', 'OMER', 'OMEX', 'OMF', 'OMGA', 'OMH', 'OMI', 'OMIC', 'ON', 'ONB', 'ONBPO', 'ONBPP', 'ONC', 'ONCO', 'ONCT', 'ONCY', 'ONDS', 'ONEG', 'ONEW', 'ONFO', 'ONFOW', 'ONIT', 'ONL', 'ONMD', 'ONMDW', 'ONON', 'ONTF', 'ONTO', 'ONVO', 'OOMA', 'OP', 'OPAD', 'OPAL', 'OPBK', 'OPCH', 'OPEN', 'OPFI', 'OPHC', 'OPI', 'OPINL', 'OPK', 'OPOF', 'OPRA', 'OPRT', 'OPRX', 'OPT', 'OPTN', 'OPTX', 'OPTXW', 'OPXS', 'OPY', 'OR', 'ORA', 'ORC', 'ORCL', 'ORGN', 'ORGNW', 'ORGO', 'ORI', 'ORIC', 'ORIS', 'ORKA', 'ORKT', 'ORLY', 'ORMP', 'ORN', 'ORRF', 'OS', 'OSBC', 'OSCR', 'OSIS', 'OSK', 'OSPN', 'OSS', 'OST', 'OSUR', 'OSW', 'OTEX', 'OTIS', 'OTLK', 'OTLY', 'OTRK', 'OTRKP', 'OTTR', 'OUST', 'OUSTW', 'OUSTZ', 'OUT', 'OVBC', 'OVID', 'OVLY', 'OVV', 'OWL', 'OWLT', 'OXBR', 'OXBRW', 'OXLCI', 'OXLCL', 'OXLCN', 'OXLCO', 'OXLCP', 'OXLCZ', 'OXM', 'OXSQ', 'OXSQG', 'OXSQZ', 'OXY', 'OZ', 'OZK', 'OZKAP', 'PAA', 'PAAS', 'PAC', 'PACB', 'PACK', 'PACS', 'PAG', 'PAGP', 'PAGS', 'PAHC', 'PAIYY', 'PAL', 'PALI', 'PAMT', 'PANL', 'PANW', 'PAR', 'PARA', 'PARAA', 'PARR', 'PASG', 'PATH', 'PATK', 'PAVM', 'PAVMZ', 'PAVS', 'PAX', 'PAXS', 'PAY', 'PAYC', 'PAYO', 'PAYS', 'PAYX', 'PB', 'PBA', 'PBBK', 'PBF', 'PBFS', 'PBH', 'PBHC', 'PBI', 'PBLA', 'PBM', 'PBMWW', 'PBPB', 'PBR', 'PBT', 'PBYI', 'PC', 'PCAR', 'PCB', 'PCG', 'PCH', 'PCLA', 'PCMM', 'PCOR', 'PCRX', 'PCSA', 'PCSC', 'PCT', 'PCTTU', 'PCTTW', 'PCTY', 'PCVX', 'PCYO', 'PD', 'PDCC', 'PDCO', 'PDD', 'PDEX', 'PDFS', 'PDLB', 'PDM', 'PDS', 'PDSB', 'PDX', 'PDYN', 'PDYNW', 'PEB', 'PEBK', 'PEBO', 'PECO', 'PEG', 'PEGA', 'PEN', 'PENG', 'PENN', 'PEP', 'PEPG', 'PERF', 'PERI', 'PESI', 'PET', 'PETS', 'PETV', 'PETVW', 'PETWW', 'PETZ', 'PEV', 'PFBC', 'PFC', 'PFE', 'PFG', 'PFGC', 'PFH', 'PFIS', 'PFLT', 'PFS', 'PFSI', 'PFXNZ', 'PG', 'PGC', 'PGEN', 'PGHL', 'PGNY', 'PGR', 'PGRE', 'PGY', 'PGYWW', 'PH', 'PHAR', 'PHAT', 'PHG', 'PHH', 'PHI', 'PHIN', 'PHIO', 'PHLT', 'PHM', 'PHR', 'PHUN', 'PHVS', 'PHX', 'PHXM', 'PI', 'PII', 'PIII', 'PIIIW', 'PINC', 'PINE', 'PINS', 'PIPR', 'PITA', 'PITAW', 'PIXY', 'PJT', 'PK', 'PKBK', 'PKE', 'PKG', 'PKOH', 'PKST', 'PKX', 'PL', 'PLAB', 'PLAO', 'PLAOU', 'PLAOW', 'PLAY', 'PLBC', 'PLBY', 'PLCE', 'PLD', 'PLL', 'PLMK', 'PLMKU', 'PLMKW', 'PLMR', 'PLNT', 'PLOW', 'PLPC', 'PLRX', 'PLRZ', 'PLSE', 'PLTD', 'PLTK', 'PLTR', 'PLTU', 'PLUG', 'PLUR', 'PLUS', 'PLUT', 'PLXS', 'PLYA', 'PLYM', 'PM', 'PMAX', 'PMCB', 'PMEC', 'PMN', 'PMNT', 'PMT', 'PMTS', 'PMTU', 'PMVP', 'PNBK', 'PNC', 'PNFP', 'PNFPP', 'PNNT', 'PNR', 'PNRG', 'PNST', 'PNTG', 'PNW', 'POAI', 'POCI', 'PODC', 'PODD', 'POET', 'POLA', 'POLE', 'POLEU', 'POLEW', 'PONY', 'POOL', 'POR', 'PORT', 'PORTU', 'POST', 'POWI', 'POWL', 'POWW', 'POWWP', 'PPBI', 'PPBT', 'PPC', 'PPG', 'PPHP', 'PPHPR', 'PPHPU', 'PPHPW', 'PPI', 'PPIH', 'PPL', 'PPSI', 'PPTA', 'PR', 'PRA', 'PRAA', 'PRAX', 'PRCH', 'PRCS', 'PRCT', 'PRDO', 'PRE', 'PRENW', 'PRFX', 'PRG', 'PRGO', 'PRGS', 'PRH', 'PRI', 'PRIM', 'PRKS', 'PRLB', 'PRLD', 'PRLH', 'PRLHU', 'PRLHW', 'PRM', 'PRMB', 'PRME', 'PRO', 'PROF', 'PROK', 'PROV', 'PRPH', 'PRPL', 'PRPO', 'PRQR', 'PRSO', 'PRST', 'PRSU', 'PRT', 'PRTA', 'PRTC', 'PRTG', 'PRTH', 'PRTS', 'PRU', 'PRVA', 'PRVS', 'PRZO', 'PSA', 'PSBD', 'PSEC', 'PSFE', 'PSHG', 'PSIG', 'PSIX', 'PSMT', 'PSN', 'PSNL', 'PSNY', 'PSNYW', 'PSO', 'PSQH', 'PSTG', 'PSTL', 'PSTV', 'PSX', 'PT', 'PTA', 'PTC', 'PTCT', 'PTEN', 'PTGX', 'PTHL', 'PTIX', 'PTIXW', 'PTLE', 'PTLO', 'PTMN', 'PTON', 'PTPI', 'PTVE', 'PUBM', 'PUK', 'PULM', 'PUMP', 'PVBC', 'PVH', 'PVL', 'PVLA', 'PWM', 'PWOD', 'PWP', 'PWR', 'PWUP', 'PWUPU', 'PWUPW', 'PX', 'PXLW', 'PXS', 'PXSAW', 'PYCR', 'PYPD', 'PYPL', 'PYT', 'PYXS', 'PZZA', 'QBIG', 'QBTS', 'QCOM', 'QCRH', 'QD', 'QDEL', 'QETA', 'QETAR', 'QETAU', 'QFIN', 'QGEN', 'QH', 'QIPT', 'QLGN', 'QLTI', 'QLYS', 'QMCO', 'QMMM', 'QNCX', 'QNRX', 'QNST', 'QNTM', 'QQLV', 'QRHC', 'QRTEA', 'QRTEB', 'QRTEP', 'QRVO', 'QS', 'QSG', 'QSI', 'QSIAW', 'QSR', 'QTRX', 'QTTB', 'QTWO', 'QUAD', 'QUBT', 'QUIK', 'QURE', 'QVCC', 'QVCD', 'QXO', 'R', 'RACE', 'RAIL', 'RAIN', 'RAINW', 'RAMP', 'RAND', 'RANG', 'RANGR', 'RANGU', 'RANI', 'RAPP', 'RAPT', 'RARE', 'RAVE', 'RAY', 'RAYA', 'RBA', 'RBB', 'RBBN', 'RBC', 'RBCAA', 'RBKB', 'RBLX', 'RBOT', 'RBRK', 'RC', 'RCAT', 'RCB', 'RCC', 'RCD', 'RCEL', 'RCI', 'RCKT', 'RCKTW', 'RCKY', 'RCL', 'RCMT', 'RCON', 'RCUS', 'RDAC', 'RDACR', 'RDACU', 'RDCM', 'RDDT', 'RDFN', 'RDHL', 'RDI', 'RDIB', 'RDN', 'RDNT', 'RDUS', 'RDVT', 'RDW', 'RDWR', 'RDY', 'RDZN', 'RDZNW', 'REAL', 'REAX', 'REBN', 'RECT', 'REE', 'REFI', 'REFR', 'REG', 'REGCO', 'REGCP', 'REGN', 'REKR', 'RELI', 'RELIW', 'RELL', 'RELX', 'RELY', 'RENB', 'RENE', 'RENEU', 'RENEW', 'RENT', 'REPL', 'RERE', 'RES', 'RETO', 'REVB', 'REVBW', 'REVG', 'REX', 'REXR', 'REYN', 'REZI', 'RF', 'RFAC', 'RFACR', 'RFACU', 'RFACW', 'RFAI', 'RFAIR', 'RFAIU', 'RFIL', 'RFL', 'RFM', 'RFMZ', 'RGA', 'RGC', 'RGCO', 'RGEN', 'RGLD', 'RGLS', 'RGNX', 'RGP', 'RGR', 'RGS', 'RGTI', 'RGTIW', 'RH', 'RHI', 'RHP', 'RIBBU', 'RICK', 'RIG', 'RIGL', 'RILY', 'RILYG', 'RILYK', 'RILYL', 'RILYM', 'RILYN', 'RILYP', 'RILYT', 'RILYZ', 'RIME', 'RIO', 'RIOT', 'RITM', 'RITR', 'RIVN', 'RJF', 'RKDA', 'RKLB', 'RKT', 'RL', 'RLAY', 'RLI', 'RLJ', 'RLMD', 'RLTY', 'RLX', 'RLYB', 'RM', 'RMAX', 'RMBI', 'RMBL', 'RMBS', 'RMCF', 'RMCO', 'RMCOW', 'RMD', 'RMGUF', 'RMI', 'RMM', 'RMMZ', 'RMNI', 'RMR', 'RMSG', 'RMSGW', 'RMTI', 'RNA', 'RNAC', 'RNAZ', 'RNG', 'RNGR', 'RNR', 'RNST', 'RNTX', 'RNW', 'RNWWW', 'RNXT', 'ROAD', 'ROCK', 'ROG', 'ROIC', 'ROIV', 'ROK', 'ROKU', 'ROL', 'ROMA', 'ROOT', 'ROP', 'ROSS', 'ROST', 'RPAY', 'RPD', 'RPID', 'RPM', 'RPRX', 'RPT', 'RPTX', 'RR', 'RRBI', 'RRC', 'RRGB', 'RRR', 'RRX', 'RS', 'RSG', 'RSI', 'RSKD', 'RSLS', 'RSSS', 'RSVR', 'RSVRW', 'RTC', 'RTO', 'RTX', 'RUM', 'RUMBW', 'RUN', 'RUSHA', 'RUSHB', 'RVLV', 'RVMD', 'RVMDW', 'RVNC', 'RVPH', 'RVPHW', 'RVSB', 'RVSN', 'RVSNW', 'RVTY', 'RVYL', 'RWAY', 'RWAYL', 'RWAYZ', 'RWT', 'RWTN', 'RWTO', 'RWTP', 'RXO', 'RXRX', 'RXST', 'RXT', 'RY', 'RYAAY', 'RYAM', 'RYAN', 'RYI', 'RYN', 'RYTM', 'RZB', 'RZC', 'RZLT', 'RZLV', 'RZLVW', 'S', 'SA', 'SABR', 'SABS', 'SABSW', 'SAFE', 'SAFT', 'SAG', 'SAGE', 'SAH', 'SAIA', 'SAIC', 'SAIH', 'SAIHW', 'SAJ', 'SAM', 'SAMG', 'SAN', 'SANA', 'SAND', 'SANG', 'SANM', 'SANW', 'SAP', 'SAR', 'SARO', 'SASR', 'SAT', 'SATL', 'SATLW', 'SATS', 'SAVA', 'SAY', 'SAZ', 'SB', 'SBAC', 'SBBA', 'SBC', 'SBCF', 'SBCWW', 'SBET', 'SBFG', 'SBFM', 'SBFMW', 'SBGI', 'SBH', 'SBIG', 'SBIGW', 'SBLK', 'SBR', 'SBRA', 'SBS', 'SBSI', 'SBSW', 'SBT', 'SBUX', 'SBXD', 'SCCO', 'SCHL', 'SCHW', 'SCI', 'SCKT', 'SCL', 'SCLX', 'SCLXW', 'SCM', 'SCNI', 'SCNX', 'SCOR', 'SCPH', 'SCS', 'SCSC', 'SCVL', 'SCWO', 'SCY', 'SCYX', 'SD', 'SDA', 'SDAWW', 'SDGR', 'SDHC', 'SDHY', 'SDIG', 'SDOT', 'SDRL', 'SDST', 'SDSTW', 'SE', 'SEAT', 'SEATW', 'SEDG', 'SEE', 'SEED', 'SEER', 'SEI', 'SEIC', 'SELF', 'SELX', 'SEM', 'SEMR', 'SENEA', 'SENEB', 'SEPN', 'SERA', 'SERV', 'SES', 'SEVN', 'SEZL', 'SF', 'SFB', 'SFBC', 'SFBS', 'SFD', 'SFHG', 'SFIX', 'SFL', 'SFM', 'SFNC', 'SFRT', 'SFRTW', 'SFST', 'SFWL', 'SG', 'SGA', 'SGBX', 'SGC', 'SGD', 'SGHC', 'SGHT', 'SGLY', 'SGMA', 'SGML', 'SGMO', 'SGMT', 'SGRP', 'SGRY', 'SGU', 'SHAK', 'SHBI', 'SHC', 'SHCO', 'SHEL', 'SHEN', 'SHFS', 'SHFSW', 'SHG', 'SHIM', 'SHIP', 'SHLS', 'SHLT', 'SHMD', 'SHMDW', 'SHO', 'SHOO', 'SHOP', 'SHOT', 'SHOTW', 'SHPH', 'SHPSQ', 'SHPWQ', 'SHW', 'SHYF', 'SIBN', 'SID', 'SIDU', 'SIEB', 'SIFY', 'SIG', 'SIGA', 'SIGI', 'SIGIP', 'SII', 'SILC', 'SIMA', 'SIMAU', 'SIMAW', 'SIMO', 'SINT', 'SIRI', 'SISI', 'SITC', 'SITE', 'SITM', 'SJ', 'SJM', 'SJT', 'SJW', 'SKBL', 'SKE', 'SKGR', 'SKGRU', 'SKGRW', 'SKIL', 'SKIN', 'SKK', 'SKLZ', 'SKM', 'SKT', 'SKWD', 'SKX', 'SKY', 'SKYE', 'SKYH', 'SKYQ', 'SKYT', 'SKYW', 'SKYX', 'SLAB', 'SLB', 'SLDB', 'SLDP', 'SLDPW', 'SLE', 'SLF', 'SLG', 'SLGL', 'SLGN', 'SLM', 'SLMBP', 'SLN', 'SLNAF', 'SLND', 'SLNG', 'SLNH', 'SLNHP', 'SLNO', 'SLNWF', 'SLP', 'SLQT', 'SLRC', 'SLRN', 'SLRX', 'SLS', 'SLVM', 'SLVO', 'SLVR', 'SLXN', 'SLXNW', 'SM', 'SMBC', 'SMBK', 'SMC', 'SMCI', 'SMCL', 'SMFG', 'SMG', 'SMHI', 'SMID', 'SMLR', 'SMMT', 'SMP', 'SMPL', 'SMR', 'SMRT', 'SMSI', 'SMTC', 'SMTI', 'SMWB', 'SMX', 'SMXT', 'SMXWW', 'SN', 'SNA', 'SNAL', 'SNAP', 'SNAX', 'SNAXW', 'SNBR', 'SNCR', 'SNCRL', 'SNCY', 'SND', 'SNDA', 'SNDL', 'SNDR', 'SNDX', 'SNES', 'SNEX', 'SNFCA', 'SNGX', 'SNN', 'SNOA', 'SNOW', 'SNPS', 'SNPX', 'SNRE', 'SNSE', 'SNT', 'SNTG', 'SNTI', 'SNV', 'SNX', 'SNY', 'SNYR', 'SO', 'SOAR', 'SOBR', 'SOC', 'SOFI', 'SOGP', 'SOHO', 'SOHOB', 'SOHON', 'SOHOO', 'SOHU', 'SOJC', 'SOJD', 'SOJE', 'SOJF', 'SOL', 'SOLV', 'SON', 'SOND', 'SONDW', 'SONM', 'SONN', 'SONO', 'SONY', 'SOPA', 'SOPH', 'SOS', 'SOTK', 'SOUN', 'SOUNW', 'SPAI', 'SPB', 'SPCB', 'SPCE', 'SPFI', 'SPG', 'SPGC', 'SPGI', 'SPH', 'SPHA', 'SPHAR', 'SPHAU', 'SPHL', 'SPHR', 'SPIR', 'SPKL', 'SPKLU', 'SPKLW', 'SPLP', 'SPMC', 'SPNS', 'SPNT', 'SPOK', 'SPOT', 'SPPL', 'SPR', 'SPRB', 'SPRC', 'SPRO', 'SPRU', 'SPRY', 'SPSC', 'SPT', 'SPTN', 'SPWH', 'SPXC', 'SQFT', 'SQFTP', 'SQFTW', 'SQLLW', 'SQM', 'SQNS', 'SR', 'SRAD', 'SRAX', 'SRBK', 'SRCE', 'SRDX', 'SRE', 'SREA', 'SRFM', 'SRG', 'SRI', 'SRL', 'SRM', 'SRPT', 'SRRK', 'SRTS', 'SRZN', 'SRZNW', 'SSB', 'SSBI', 'SSBK', 'SSD', 'SSKN', 'SSL', 'SSNC', 'SSP', 'SSRM', 'SSSS', 'SSSSL', 'SST', 'SSTI', 'SSTK', 'SSYS', 'ST', 'STAA', 'STAF', 'STAG', 'STBA', 'STBX', 'STC', 'STE', 'STEC', 'STEL', 'STEM', 'STEP', 'STEW', 'STFS', 'STG', 'STGW', 'STHO', 'STI', 'STIM', 'STKH', 'STKL', 'STKS', 'STLA', 'STLD', 'STM', 'STN', 'STNE', 'STNG', 'STOK', 'STR', 'STRA', 'STRL', 'STRM', 'STRO', 'STRR', 'STRRP', 'STRS', 'STRT', 'STSS', 'STSSW', 'STT', 'STTK', 'STVN', 'STWD', 'STX', 'STZ', 'SU', 'SUGP', 'SUI', 'SUM', 'SUN', 'SUNE', 'SUNS', 'SUP', 'SUPN', 'SUPV', 'SURG', 'SUZ', 'SVC', 'SVCCU', 'SVCO', 'SVII', 'SVIIR', 'SVIIU', 'SVIIW', 'SVRA', 'SVRE', 'SVREW', 'SVV', 'SW', 'SWAG', 'SWAGW', 'SWBI', 'SWI', 'SWIM', 'SWIN', 'SWK', 'SWKH', 'SWKHL', 'SWKS', 'SWSS', 'SWSSU', 'SWSSW', 'SWTX', 'SWVL', 'SWVLW', 'SWX', 'SXC', 'SXI', 'SXT', 'SXTC', 'SXTP', 'SXTPW', 'SY', 'SYBT', 'SYBX', 'SYF', 'SYK', 'SYM', 'SYNA', 'SYPR', 'SYRA', 'SYRE', 'SYRS', 'SYT', 'SYTA', 'SYTAW', 'SYY', 'T', 'TAC', 'TACT', 'TAIT', 'TAK', 'TAL', 'TALK', 'TALKW', 'TALO', 'TANH', 'TAOP', 'TAP', 'TARA', 'TARS', 'TASK', 'TATT', 'TAVI', 'TAVIR', 'TAVIU', 'TAX', 'TAYD', 'TBB', 'TBBB', 'TBBK', 'TBCH', 'TBI', 'TBLA', 'TBLAW', 'TBLD', 'TBLT', 'TBMC', 'TBMCR', 'TBN', 'TBNK', 'TBPH', 'TBRG', 'TC', 'TCBC', 'TCBI', 'TCBIO', 'TCBK', 'TCBP', 'TCBPW', 'TCBS', 'TCBX', 'TCI', 'TCMD', 'TCOM', 'TCPC', 'TCRT', 'TCRX', 'TCTM', 'TCX', 'TD', 'TDACU', 'TDC', 'TDG', 'TDOC', 'TDS', 'TDTH', 'TDUP', 'TDW', 'TDY', 'TEAF', 'TEAM', 'TECH', 'TECK', 'TECTP', 'TECX', 'TEF', 'TEL', 'TELA', 'TELO', 'TEM', 'TEN', 'TENB', 'TENX', 'TEO', 'TER', 'TERN', 'TEVA', 'TEX', 'TFC', 'TFFP', 'TFII', 'TFIN', 'TFINP', 'TFPM', 'TFSA', 'TFSL', 'TFX', 'TG', 'TGI', 'TGL', 'TGLS', 'TGNA', 'TGS', 'TGT', 'TGTX', 'TH', 'THAR', 'THC', 'THCH', 'THCHW', 'THFF', 'THG', 'THO', 'THR', 'THRD', 'THRM', 'THRY', 'THS', 'THTX', 'TIGO', 'TIGR', 'TIL', 'TILE', 'TIMB', 'TIPT', 'TIRX', 'TISI', 'TITN', 'TIVC', 'TIXT', 'TJX', 'TK', 'TKC', 'TKLF', 'TKNO', 'TKO', 'TKR', 'TLF', 'TLK', 'TLPH', 'TLRY', 'TLS', 'TLSA', 'TLSI', 'TLSIW', 'TLX', 'TLYS', 'TM', 'TMC', 'TMCI', 'TMCWW', 'TMDX', 'TME', 'TMHC', 'TMO', 'TMUS', 'TNC', 'TNDM', 'TNET', 'TNFA', 'TNGX', 'TNK', 'TNL', 'TNMG', 'TNON', 'TNONW', 'TNXP', 'TNYA', 'TOI', 'TOIIW', 'TOL', 'TOMZ', 'TOP', 'TOPS', 'TORO', 'TOST', 'TOUR', 'TOWN', 'TOYO', 'TPB', 'TPC', 'TPCS', 'TPG', 'TPGXL', 'TPH', 'TPIC', 'TPL', 'TPLS', 'TPR', 'TPST', 'TPTA', 'TPVG', 'TPX', 'TR', 'TRAK', 'TRAW', 'TRC', 'TRDA', 'TREE', 'TREX', 'TRGP', 'TRI', 'TRIB', 'TRIN', 'TRINI', 'TRINZ', 'TRIP', 'TRMB', 'TRMD', 'TRMK', 'TRML', 'TRN', 'TRNO', 'TRNR', 'TRNS', 'TROO', 'TROW', 'TROX', 'TRP', 'TRS', 'TRSG', 'TRST', 'TRTX', 'TRU', 'TRUE', 'TRUG', 'TRUP', 'TRV', 'TRVG', 'TRVI', 'TRVN', 'TS', 'TSAT', 'TSBK', 'TSBX', 'TSCO', 'TSE', 'TSEM', 'TSHA', 'TSLA', 'TSLG', 'TSLX', 'TSM', 'TSMU', 'TSN', 'TSQ', 'TSRI', 'TSSI', 'TSVT', 'TSYY', 'TT', 'TTAN', 'TTC', 'TTD', 'TTE', 'TTEC', 'TTEK', 'TTGT', 'TTI', 'TTMI', 'TTNP', 'TTOO', 'TTSH', 'TTWO', 'TU', 'TUPBQ', 'TURB', 'TURN', 'TUSK', 'TUYA', 'TV', 'TVC', 'TVE', 'TVGN', 'TVGNW', 'TVTX', 'TW', 'TWFG', 'TWG', 'TWI', 'TWIN', 'TWLO', 'TWNP', 'TWO', 'TWST', 'TX', 'TXG', 'TXMD', 'TXN', 'TXNM', 'TXO', 'TXRH', 'TXT', 'TXUE', 'TXUG', 'TYGO', 'TYL', 'TYRA', 'TZOO', 'U', 'UA', 'UAA', 'UAL', 'UAN', 'UBCP', 'UBER', 'UBFO', 'UBS', 'UBSI', 'UBX', 'UBXG', 'UCAR', 'UCB', 'UCL', 'UCTT', 'UDMY', 'UDR', 'UE', 'UEIC', 'UFCS', 'UFG', 'UFI', 'UFPI', 'UFPT', 'UG', 'UGI', 'UGP', 'UGRO', 'UHAL', 'UHG', 'UHGWW', 'UHS', 'UHT', 'UI', 'UIS', 'UK', 'UKOMW', 'UL', 'ULBI', 'ULCC', 'ULH', 'ULS', 'ULTA', 'ULY', 'UMBF', 'UMBFP', 'UMC', 'UMH', 'UNB', 'UNCY', 'UNF', 'UNFI', 'UNH', 'UNIT', 'UNM', 'UNMA', 'UNP', 'UNTY', 'UOKA', 'UONE', 'UONEK', 'UP', 'UPB', 'UPBD', 'UPC', 'UPLD', 'UPS', 'UPST', 'UPWK', 'UPXI', 'URBN', 'URGN', 'URI', 'UROY', 'USAC', 'USAU', 'USB', 'USCB', 'USEA', 'USEG', 'USFD', 'USGO', 'USGOW', 'USIO', 'USLM', 'USM', 'USNA', 'USOI', 'USPH', 'USTWF', 'UTHR', 'UTI', 'UTL', 'UTMD', 'UTSI', 'UTZ', 'UVE', 'UVSP', 'UVV', 'UWMC', 'UXIN', 'UZD', 'UZE', 'UZF', 'V', 'VABK', 'VAC', 'VACH', 'VACHU', 'VACHW', 'VAL', 'VALE', 'VALN', 'VALU', 'VANI', 'VATE', 'VBFC', 'VBNK', 'VBTX', 'VC', 'VCEL', 'VCIC', 'VCICU', 'VCICW', 'VCIG', 'VCNX', 'VCSA', 'VCTR', 'VCYT', 'VECO', 'VECT', 'VEEA', 'VEEAW', 'VEEE', 'VEEV', 'VEL', 'VEON', 'VERA', 'VERB', 'VERI', 'VERO', 'VERU', 'VERV', 'VERX', 'VET', 'VFC', 'VFF', 'VFS', 'VFSWW', 'VG', 'VGAS', 'VGASW', 'VHC', 'VHI', 'VIASP', 'VIAV', 'VICI', 'VICR', 'VIGL', 'VIK', 'VINC', 'VINP', 'VIOT', 'VIPS', 'VIR', 'VIRC', 'VIRT', 'VISL', 'VIST', 'VITL', 'VIV', 'VIVK', 'VKTX', 'VLCN', 'VLGEA', 'VLN', 'VLO', 'VLRS', 'VLTO', 'VLY', 'VLYPO', 'VLYPP', 'VMAR', 'VMC', 'VMCA', 'VMCAU', 'VMCAW', 'VMD', 'VMEO', 'VMI', 'VNCE', 'VNDA', 'VNET', 'VNO', 'VNOM', 'VNT', 'VOC', 'VOD', 'VOR', 'VOXR', 'VOXX', 'VOYA', 'VPG', 'VRA', 'VRAR', 'VRAX', 'VRCA', 'VRDN', 'VRE', 'VREX', 'VRME', 'VRMEW', 'VRMMQ', 'VRN', 'VRNA', 'VRNS', 'VRNT', 'VRPX', 'VRRM', 'VRSK', 'VRSN', 'VRT', 'VRTS', 'VRTX', 'VS', 'VSAT', 'VSCO', 'VSEC', 'VSEE', 'VSEEW', 'VSH', 'VSME', 'VSSYW', 'VST', 'VSTA', 'VSTE', 'VSTEW', 'VSTM', 'VSTS', 'VTEX', 'VTGN', 'VTLE', 'VTMX', 'VTOL', 'VTR', 'VTRS', 'VTS', 'VTSI', 'VTVT', 'VTYX', 'VUZI', 'VVOS', 'VVPR', 'VVV', 'VVX', 'VXRT', 'VYGR', 'VYNE', 'VYX', 'VZ', 'W', 'WAB', 'WABC', 'WAFD', 'WAFDP', 'WAFU', 'WAI', 'WAL', 'WALD', 'WALDW', 'WASH', 'WAT', 'WATT', 'WAVE', 'WAY', 'WB', 'WBA', 'WBD', 'WBS', 'WBTN', 'WBX', 'WCC', 'WCN', 'WCT', 'WD', 'WDAY', 'WDC', 'WDFC', 'WDH', 'WDI', 'WDS', 'WEAV', 'WEC', 'WELL', 'WEN', 'WERN', 'WES', 'WEST', 'WEX', 'WEYS', 'WF', 'WFC', 'WFCF', 'WFG', 'WFRD', 'WGO', 'WGS', 'WGSWW', 'WH', 'WHD', 'WHF', 'WHFCL', 'WHG', 'WHLR', 'WHLRD', 'WHLRL', 'WHLRP', 'WHR', 'WILC', 'WIMI', 'WINA', 'WING', 'WINT', 'WINV', 'WINVR', 'WINVU', 'WINVW', 'WIT', 'WIX', 'WK', 'WKC', 'WKEY', 'WKHS', 'WKSP', 'WLAC', 'WLACU', 'WLACW', 'WLDN', 'WLDS', 'WLDSW', 'WLFC', 'WLGS', 'WLK', 'WLKP', 'WLY', 'WLYB', 'WM', 'WMB', 'WMG', 'WMK', 'WMPN', 'WMS', 'WMT', 'WNC', 'WNEB', 'WNS', 'WNW', 'WOK', 'WOLF', 'WOOF', 'WOR', 'WORX', 'WOW', 'WPC', 'WPM', 'WPP', 'WPRT', 'WRAP', 'WRB', 'WRBY', 'WRD', 'WRLD', 'WS', 'WSBC', 'WSBCP', 'WSBF', 'WSC', 'WSFS', 'WSM', 'WSO', 'WSR', 'WST', 'WT', 'WTBA', 'WTFC', 'WTFCM', 'WTFCP', 'WTI', 'WTM', 'WTMA', 'WTMAR', 'WTMAU', 'WTO', 'WTRG', 'WTS', 'WTTR', 'WTW', 'WU', 'WULF', 'WVE', 'WVVI', 'WVVIP', 'WW', 'WWD', 'WWW', 'WY', 'WYHG', 'WYNN', 'WYTC', 'X', 'XAIR', 'XBIO', 'XBIT', 'XBP', 'XBPEW', 'XCH', 'XCUR', 'XEL', 'XELB', 'XENE', 'XERS', 'XFOR', 'XGN', 'XHG', 'XHR', 'XIFR', 'XIN', 'XLO', 'XMTR', 'XNCR', 'XNET', 'XOM', 'XOMA', 'XOMAO', 'XOMAP', 'XOS', 'XOSWW', 'XP', 'XPEL', 'XPER', 'XPEV', 'XPO', 'XPOF', 'XPON', 'XPRO', 'XRAY', 'XRTX', 'XRX', 'XTIA', 'XTKG', 'XTLB', 'XWEL', 'XXII', 'XYF', 'XYL', 'XYLO', 'XYZ', 'YAAS', 'YALA', 'YELP', 'YETI', 'YEXT', 'YGMZ', 'YHC', 'YHGJ', 'YHNA', 'YHNAR', 'YHNAU', 'YI', 'YIBO', 'YJ', 'YMAB', 'YMM', 'YORW', 'YOSH', 'YOTA', 'YOTAR', 'YOTAU', 'YOTAW', 'YOU', 'YPF', 'YQ', 'YRD', 'YSG', 'YSXT', 'YTRA', 'YUM', 'YUMC', 'YXT', 'YY', 'YYAI', 'YYGH', 'Z', 'ZAP', 'ZAPP', 'ZAPPW', 'ZBAI', 'ZBAO', 'ZBH', 'ZBIO', 'ZBRA', 'ZCAR', 'ZCARW', 'ZCMD', 'ZCZZT', 'ZD', 'ZENA', 'ZENV', 'ZEO', 'ZEOWW', 'ZEPP', 'ZETA', 'ZEUS', 'ZG', 'ZGN', 'ZH', 'ZI', 'ZIM', 'ZIMV', 'ZION', 'ZIONP', 'ZIP', 'ZIVO', 'ZIVOW', 'ZJK', 'ZJYL', 'ZJZZT', 'ZK', 'ZKH', 'ZKIN', 'ZLAB', 'ZLSSF', 'ZLSUF', 'ZLSWF', 'ZM', 'ZNTL', 'ZOOZ', 'ZOOZW', 'ZS', 'ZSPC', 'ZTEK', 'ZTO', 'ZTS', 'ZUMZ', 'ZUO', 'ZURA', 'ZVIA', 'ZVRA', 'ZVSA', 'ZVZZT', 'ZWS', 'ZWZZT', 'ZXZZT', 'ZYBT', 'ZYME', 'ZYXI']

api_key = os.getenv('TIINGO_KEY')  # Load API key from environment variable


#maintenance mode
def set_maintenance_mode(mode):
    collection = db["systemSettings"]
    
    # Update the document with name = 'EreunaApp'
    collection.update_one(
        {"name": "EreunaApp"},
        {
            "$set": {
                "maintenance": mode,
                "lastUpdated": datetime.datetime.now()  # Set to current date in BSON format
            }
        }
    )
    client.close()
    

#symbol, name, description, IPO, exchange
def getSummary():
    collection = db['AssetInfo']  
    for ticker in tqdm(tickers, desc="Fetching data", unit="ticker"):
        url = f'https://api.tiingo.com/tiingo/daily/{ticker}?token={api_key}'
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            if data is None:
                print(f'No data found for {ticker}')
                continue
            
            # Find the document in MongoDB where Symbol matches the ticker
            result = collection.find_one({'Symbol': ticker})
            if result:
                # Update the existing document
                collection.update_one(
                    {'Symbol': ticker},
                    {'$set': {
                        'Symbol': data['ticker'],
                        'Name': data['name'],
                        'Description': data['description'],
                        'IPO': datetime.strptime(data['startDate'], '%Y-%m-%d') if data.get('startDate') else None,  # Convert to BSON date
                        'LastUpdated': datetime.strptime(data['endDate'], '%Y-%m-%d') if data.get('endDate') else None,  # Convert to BSON date
                        'Exchange': data['exchangeCode']
                    }}
                )
                print(f'{ticker} Summary Updated Successfully')
            else:
                # Insert a new document
                collection.insert_one({
                    'Symbol': data['ticker'],
                    'Name': data['name'],
                    'Description': data['description'],
                    'IPO': datetime.strptime(data['startDate'], '%Y-%m-%d') if data.get('startDate') else None,  # Convert to BSON date
                    'LastUpdated': datetime.strptime(data['endDate'], '%Y-%m-%d') if data.get('endDate') else None,  # Convert to BSON date
                    'Exchange': data['exchangeCode']
                })
                print(f'No document found, creating a new document for {ticker}')
        else:
            print(f"Error fetching data for {ticker}: {response.status_code}")
    
#isActive, sector, industry, currency, location, country         
def getSummary2():
    url = f'https://api.tiingo.com/tiingo/fundamentals/meta?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        for ticker in tickers:
            ticker = ticker.lower()
            ticker_data = next((item for item in data if item['ticker'] == ticker), None)
            if ticker_data is None:
                print(f'No data found for {ticker}')
                continue

            # Extract the required information
            is_active = ticker_data.get('isActive')
            sector = ticker_data.get('sector')
            industry = ticker_data.get('industry')
            reporting_currency = ticker_data.get('reportingCurrency').upper()
            location = ticker_data.get('location')
            country = location.split(', ')[-1] if location else None
            address = location if location else None

            collection = db['AssetInfo']

            # Update the document in MongoDB where Symbol matches the ticker
            collection.update_one(
                {'Symbol': ticker.upper()},
                {'$set': {
                    'isActive': is_active,
                    'Sector': sector,
                    'Industry': industry,
                    'Currency': reporting_currency,
                    'Address': address,
                    'Country': country
                }},
                upsert=True
            )
            print(f'{ticker} Summary Data Updated Successfully')
    else:
        print(f"Failed to retrieve data. Status code: {response.status_code}")
        print(response.text)
    
# daily OHCLV 
def getPrice():
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]

    # Fetch all data at once
    url = f'https://api.tiingo.com/tiingo/daily/prices?token={api_key}'
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()

        # Filter data based on ticker
        filtered_data = [doc for doc in data if doc['ticker'].lower() in [ticker.lower() for ticker in tickers]]

        if filtered_data:  # Check if filtered_data is not empty
            # Process the data in bulk
            df = pd.DataFrame(filtered_data)
            df.columns = ['ticker', 'date', 'close', 'high', 'low', 'open', 'volume', 'adjClose', 'adjHigh', 'adjLow', 'adjOpen', 'adjVolume', 'divCash', 'splitFactor']

            # Convert NumPy types to Python native types
            def convert_numpy_types(doc):
                return {
                    k: (int(v) if isinstance(v, np.integer) else 
                        float(v) if isinstance(v, np.floating) else 
                        v) for k, v in doc.items()
                }

            # Convert dataframe to list of dictionaries
            daily_data_dict = df.to_dict(orient='records')
            daily_data_dict = [convert_numpy_types(doc) for doc in daily_data_dict]

            # Rename fields
            for doc in daily_data_dict:
                doc['tickerID'] = doc.pop('ticker').upper()
                doc['timestamp'] = datetime.strptime(doc['date'], '%Y-%m-%d')

            # Insert daily documents, preventing duplicates
            for daily_doc in daily_data_dict:
                existing_daily_doc = daily_collection.find_one({
                    'tickerID': daily_doc['tickerID'], 
                    'timestamp': daily_doc['timestamp']
                })
                
                if not existing_daily_doc:
                    daily_collection.insert_one(daily_doc)
                    print(f"Inserted daily document for {daily_doc['tickerID']} on {daily_doc['timestamp']}")
                else:
                    print(f"Daily document for {daily_doc['tickerID']} on {daily_doc['timestamp']} already exists")

            # Process weekly data from daily data
            df['timestamp'] = pd.to_datetime(df['date'])
            weekly_grouped = df.groupby(pd.Grouper(key='timestamp', freq='W-MON'))

            for week_start, week_data in weekly_grouped:
                if not week_data.empty:
                    weekly_doc = {
                        'tickerID': week_data['ticker'].iloc[0].upper(),
                        'timestamp': week_start.to_pydatetime(),
                        'open': float(week_data['open'].iloc[0]),
                        'high': float(week_data['high'].max()),
                        'low': float(week_data['low'].min()),
                        'close': float(week_data['close'].iloc[-1]),
                        'volume': int(week_data['volume'].sum())
                    }
                    
                    # Check if weekly document already exists
                    existing_weekly_doc = weekly_collection.find_one({
                        'tickerID': weekly_doc['tickerID'], 
                        'timestamp': weekly_doc['timestamp']
                    })
                    
                    if not existing_weekly_doc:
                        weekly_collection.insert_one(weekly_doc)
                        print(f"Inserted weekly document for {weekly_doc['tickerID']} on {weekly_doc['timestamp']}")
                    else:
                        print(f"Weekly document for {weekly_doc['tickerID']} on {weekly_doc['timestamp']} already exists")
        else:
            print("No data found for the specified tickers.")
    else:
        print(f"Error: {response.text}")
    

def updateDailyRatios():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    for ticker in tickers:
        try:
            # Get the most recent OHCLV document
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            ohclv_doc = list(ohclv_collection.aggregate(pipeline))[0]

            if ohclv_doc:
                current_price = ohclv_doc['close']

                # Get the asset info document
                asset_info_doc = asset_info_collection.find_one({'Symbol': ticker})
                if asset_info_doc:
                    # Calculate the market capitalization
                    shares_outstanding = asset_info_doc.get('SharesOutstanding', 0)
                    market_cap = current_price * shares_outstanding

                    # Calculate the price-to-earnings ratio
                    eps = asset_info_doc.get('EPS', 0)
                    if isinstance(eps, str):
                        eps = float(eps) if eps.replace('.', '', 1).isdigit() else 0
                    pe_ratio = current_price / eps if eps != 0 else 0

                    # Calculate the price-to-book ratio
                    quarterly_financials = asset_info_doc.get('quarterlyFinancials', [])
                    if quarterly_financials:
                        most_recent_financials = quarterly_financials[0]
                        total_assets = most_recent_financials.get('totalAssets', 0)
                        total_liabilities = most_recent_financials.get('totalLiabilities', 0)
                        book_value = total_assets - total_liabilities
                        shares_outstanding = asset_info_doc.get('SharesOutstanding', 0)
                        if shares_outstanding != 0:
                            book_value_per_share = book_value / shares_outstanding
                            pb_ratio = current_price / book_value_per_share if book_value_per_share != 0 else 0
                        else:
                            pb_ratio = 0
                    else:
                        pb_ratio = 0

                    # Calculate the trailing price-to-earnings growth ratio
                    quarterly_earnings = asset_info_doc.get('quarterlyEarnings', [])
                    if len(quarterly_earnings) >= 2:
                        most_recent_eps = quarterly_earnings[0].get('reportedEPS', 0)
                        previous_eps = quarterly_earnings[1].get('reportedEPS', 0)
                        eps_growth_rate = (most_recent_eps - previous_eps) / previous_eps if previous_eps != 0 else 0
                        trailing_peg = pe_ratio / eps_growth_rate if eps_growth_rate != 0 else 0
                    else:
                        trailing_peg = 0

                    # Update the asset info document
                    updates.append(
                        UpdateOne(
                            {'Symbol': ticker},
                            {'$set': {
                                'MarketCapitalization': market_cap,
                                'PERatio': pe_ratio,
                                'PriceToBookRatio': pb_ratio,
                                'PEGRatio': trailing_peg
                            }}
                        )
                    )
                    print(f"{ticker} Daily Ratios Updated Successfully")
                else:
                    print(f"No asset info found for {ticker}")
            else:
                print(f"No OHCLV data found for {ticker}")
        except Exception as e:
            print(f"Error processing {ticker}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")


def getDividendYield():
    collection = db['AssetInfo']

    for ticker in tqdm(tickers, desc="Fetching dividend yields", unit="ticker"):
        url = f'https://api.tiingo.com/tiingo/corporate-actions/{ticker}/distribution-yield?token={api_key}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()
            if data is None or len(data) == 0:
                print(f'No data found for {ticker}')
                # Find the document in MongoDB where Symbol matches the ticker
                result = collection.find_one({'Symbol': ticker})
                if result:
                    # Update the existing document
                    collection.update_one(
                        {'Symbol': ticker},
                        {'$set': {'DividendYield': None}}
                    )
                    print(f'{ticker} Dividend Yield Updated Successfully')
                else:
                    # Insert a new document
                    collection.insert_one({
                        'Symbol': ticker,
                        'DividendYield': None
                    })
                    print(f'No document found, creating a new document for {ticker}')
                continue

            # Get the last object in the list
            last_data = data[-1]

            # Extract the dividend yield
            dividend_yield = last_data.get('trailingDiv1Y')

            # Find the document in MongoDB where Symbol matches the ticker
            result = collection.find_one({'Symbol': ticker})
            if result:
                # Update the existing document
                collection.update_one(
                    {'Symbol': ticker},
                    {'$set': {'DividendYield': dividend_yield}}
                )
                print(f'{ticker} Dividend Yield Updated Successfully')
            else:
                # Insert a new document
                collection.insert_one({
                    'Symbol': ticker,
                    'DividendYield': dividend_yield
                })
                print(f'No document found, creating a new document for {ticker}')
        else:
            print(f"Error fetching data for {ticker}: {response.status_code}")

def getSplits():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    for ticker in tickers:
        try:
            # Find the documents in OHCLVData with the current ticker
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$project': {'_id': 0, 'timestamp': 1, 'splitFactor': 1}}
            ]
            ohclv_data = list(ohclv_data_collection.aggregate(pipeline))

            # Initialize a list to store the splits
            splits = []

            # Loop through each document in OHCLVData
            for document in ohclv_data:
                # Check if the split factor is not 1
                if document.get('splitFactor', 1) != 1:
                    # Create a new split document
                    split = {
                        'effective_date': document['timestamp'],
                        'split_factor': document['splitFactor']
                    }
                    # Add the split to the list
                    splits.append(split)

            # Find the document in AssetInfo with the current ticker
            asset_info = asset_info_collection.find_one({'Symbol': ticker})

            # If the document exists, update the splits
            if asset_info:
                # Remove the existing splits
                updates.append(
                    UpdateOne(
                        {'Symbol': ticker},
                        {'$set': {'splits': []}}
                    )
                )

                # Add the new splits
                updates.append(
                    UpdateOne(
                        {'Symbol': ticker},
                        {'$push': {'splits': {'$each': splits}}}
                    )
                )
                print(f'Updated splits for ticker: {ticker}')
            else:
                print(f'No AssetInfo found for ticker: {ticker}')
        except Exception as e:
            print(f'Error updating splits for ticker: {ticker} - {str(e)}')

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

    
def getDividends():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    for ticker in tickers:
        try:
            # Find the documents in OHCLVData with the current ticker
            pipeline = [
                {'$match': {'tickerID': ticker}},
                {'$project': {'_id': 0, 'timestamp': 1, 'divCash': 1}}
            ]
            ohclv_data = list(ohclv_data_collection.aggregate(pipeline))

            # Initialize a list to store the dividends
            dividends = []

            # Loop through each document in OHCLVData
            for document in ohclv_data:
                # Check if the divCash is not 0
                if document.get('divCash', 0) != 0:
                    # Create a new dividend document
                    dividend = {
                        'payment_date': document['timestamp'],
                        'amount': document['divCash']
                    }
                    # Add the dividend to the list
                    dividends.append(dividend)

            # Find the document in AssetInfo with the current ticker
            asset_info = asset_info_collection.find_one({'Symbol': ticker})

            # If the document exists, update the dividends
            if asset_info:
                # Remove the existing dividends
                updates.append(
                    UpdateOne(
                        {'Symbol': ticker},
                        {'$set': {'dividends': []}}
                    )
                )

                # Add the new dividends
                updates.append(
                    UpdateOne(
                        {'Symbol': ticker},
                        {'$push': {'dividends': {'$each': dividends}}}
                    )
                )
                print(f'Updated dividends for ticker: {ticker}')
            else:
                print(f'No AssetInfo found for ticker: {ticker}')
        except Exception as e:
            print(f'Error updating dividends for ticker: {ticker} - {str(e)}')

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

   
def update_asset_info_with_time_series():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Updating Asset Time Series...")
    for i, stock in enumerate(tickers):
        try:
            recent_doc = ohclv_collection.find_one(
                {'tickerID': stock}, 
                sort=[('timestamp', -1)]
            )
            if recent_doc:
                time_series_data = {
                   '1. open': round(float(recent_doc.get('open', 0)), 2),
                    '2. high': round(float(recent_doc.get('high', 0)), 2),
                    '3. low': round(float(recent_doc.get('low', 0)), 2),
                    '4. close': round(float(recent_doc.get('close', 0)), 2),
                    '5. volume': round(float(recent_doc.get('volume', 0)), 2)
                }
                current_date = recent_doc['timestamp'].strftime('%Y-%m-%d')
                updates.append(
                    UpdateOne(
                        {'Symbol': stock},
                        {'$set': {
                            f'TimeSeries.{current_date}': time_series_data
                        }}
                    )
                )
            print(f"Processed {i+1} out of {len(tickers)} stocks")
        except Exception as e:
            print(f"Error processing {stock}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
   
#calculates average volume for 1w, 1m, 6m and 1y
def calculate_volumes():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []

    print("Calculating Volumes...")
    for i, stock in enumerate(tickers):
        try:
            pipeline = [
                {'$match': {'tickerID': stock}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'volume': 1}}
            ]
            documents = list(ohclv_collection.aggregate(pipeline))

            volumes = [doc["volume"] for doc in documents]
            avg_volume_1w = sum(volumes[-7:]) / 7 if len(volumes) >= 7 else None
            avg_volume_1m = sum(volumes[-30:]) / 30 if len(volumes) >= 30 else None
            avg_volume_6m = sum(volumes[-180:]) / 180 if len(volumes) >= 180 else None
            avg_volume_1y = sum(volumes[-365:]) / 365 if len(volumes) >= 365 else None
            rel_volume_1w = round(volumes[-1] / avg_volume_1w, 1) if avg_volume_1w else None
            rel_volume_1m = round(volumes[-1] / avg_volume_1m, 1) if avg_volume_1m else None
            rel_volume_6m = round(volumes[-1] / avg_volume_6m, 1) if avg_volume_6m else None
            rel_volume_1y = round(volumes[-1] / avg_volume_1y, 1) if avg_volume_1y else None

            updates.append(
                UpdateOne(
                    {'Symbol': stock},
                    {'$set': {
                        'AvgVolume1W': int(avg_volume_1w) if avg_volume_1w else None,
                        'AvgVolume1M': int(avg_volume_1m) if avg_volume_1m else None,
                        'AvgVolume6M': int(avg_volume_6m) if avg_volume_6m else None,
                        'AvgVolume1Y': int(avg_volume_1y) if avg_volume_1y else None,
                        'RelVolume1W': rel_volume_1w,
                        'RelVolume1M': rel_volume_1m,
                        'RelVolume6M': rel_volume_6m,
                        'RelVolume1Y': rel_volume_1y
                    }}
                )
            )
            print(f"Processed {i+1} out of {len(tickers)} stocks")
        except Exception as e:
            print(f"Error processing {stock}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

#calculates moving averages (10, 20, 50 and 200DMA)
def calculate_moving_averages():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []

    print("Calculating Moving Averages...")
    for i, stock in enumerate(tickers):
        try:
            pipeline = [
                {'$match': {'tickerID': stock}},
                {'$sort': {'timestamp': 1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            documents = list(ohclv_collection.aggregate(pipeline))

            closes = [doc["close"] for doc in documents]
            ma_10 = sum(closes[-10:]) / 10 if len(closes) >= 10 else None
            ma_20 = sum(closes[-20:]) / 20 if len(closes) >= 20 else None
            ma_50 = sum(closes[-50:]) / 50 if len(closes) >= 50 else None
            ma_100 = sum(closes[-100:]) / 100 if len(closes) >= 100 else None
            ma_200 = sum(closes[-200:]) / 200 if len(closes) >= 200 else None

            updates.append(
                UpdateOne(
                    {'Symbol': stock},
                    {'$set': {
                        'MA10': round(ma_10, 2) if ma_10 else None,
                        'MA20': round(ma_20, 2) if ma_20 else None,
                        'MA50': round(ma_50, 2) if ma_50 else None,
                        'MA100': round(ma_100, 2) if ma_100 else None,
                        'MA200': round(ma_200, 2) if ma_200 else None
                    }}
                )
            )
            print(f"Processed {i+1} out of {len(tickers)} stocks")
        except Exception as e:
            print(f"Error processing {stock}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

def calculate_rs_scores():
    ohclv_collection = db["OHCLVData"]
    asset_info_collection = db["AssetInfo"]
    updates = []

    print("Calculating Percentage Changes...")
    for i, stock in enumerate(tickers):
        try:
            pipeline = [
                {'$match': {'tickerID': stock}},
                {'$sort': {'timestamp': -1}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            documents = list(ohclv_collection.aggregate(pipeline))

            recent_close = documents[0]["close"] if documents else None
            historical_close_1w = documents[4]["close"] if len(documents) >= 5 else documents[-1]["close"] if documents else None
            historical_close_1m = documents[19]["close"] if len(documents) >= 20 else documents[-1]["close"] if documents else None
            historical_close_4m = documents[79]["close"] if len(documents) >= 80 else documents[-1]["close"] if documents else None

            if historical_close_1w:
                percentage_change_1w = (recent_close - historical_close_1w) / historical_close_1w * 100
                updates.append(
                    UpdateOne(
                        {'Symbol': stock},
                        {'$set': {'percentage_change_1w': percentage_change_1w}}
                    )
                )
            if historical_close_1m:
                percentage_change_1m = (recent_close - historical_close_1m) / historical_close_1m * 100
                updates.append(
                    UpdateOne(
                        {'Symbol': stock},
                        {'$set': {'percentage_change_1m': percentage_change_1m}}
                    )
                )
            if historical_close_4m:
                percentage_change_4m = (recent_close - historical_close_4m) / historical_close_4m * 100
                updates.append(
                    UpdateOne(
                        {'Symbol': stock},
                        {'$set': {'percentage_change_4m': percentage_change_4m}}
                    )
                )
            print(f"Processed {i+1} out of {len(tickers)} stocks")
        except Exception as e:
            print(f"Error processing {stock}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

    print("Calculating RS Scores...")
    pipeline = [
        {'$match': {}},
        {'$project': {'_id': 0, 'Symbol': 1, 'percentage_change_1w': 1, 'percentage_change_1m': 1, 'percentage_change_4m': 1}}
    ]
    documents = list(asset_info_collection.aggregate(pipeline))

    stock_data_1w = []
    stock_data_1m = []
    stock_data_4m = []
    for doc in documents:
        if 'percentage_change_1w' in doc:
            stock_data_1w.append({'name': doc['Symbol'], 'percentage_change': doc['percentage_change_1w']})
        if 'percentage_change_1m' in doc:
            stock_data_1m.append({'name': doc['Symbol'], 'percentage_change': doc['percentage_change_1m']})
        if 'percentage_change_4m' in doc:
            stock_data_4m.append({'name': doc['Symbol'], 'percentage_change': doc['percentage_change_4m']})

    stock_data_1w.sort(key=lambda x: x["percentage_change"])
    stock_data_1m.sort(key=lambda x: x["percentage_change"])
    stock_data_4m.sort(key=lambda x: x["percentage_change"])

    updates = []
    for i, stock in enumerate(stock_data_1w):
        rs_score_1w = int((i / len(stock_data_1w)) * 100) + 1
        updates.append(
            UpdateOne(
                {'Symbol': stock["name"]},
                {'$set': {'RSScore1W': rs_score_1w}}
            )
        )
    for i, stock in enumerate(stock_data_1m):
        rs_score_1m = int((i / len(stock_data_1m)) * 100) + 1
        updates.append(
            UpdateOne(
                {'Symbol': stock["name"]},
                {'$set': {'RSScore1M': rs_score_1m}}
            )
        )
    for i, stock in enumerate(stock_data_4m):
        rs_score_4m = int((i / len(stock_data_4m)) * 100) + 1
        updates.append(
            UpdateOne(
                {'Symbol': stock["name"]},
                {'$set': {'RSScore4M': rs_score_4m}}
            )
        )

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

    print("Updating Asset Info...")
    updates = []
    for stock in tickers:
        asset_info_doc = asset_info_collection.find_one({'Symbol': stock})
        if asset_info_doc:
            updates.append(
                UpdateOne(
                    {'Symbol': stock},
                    {'$set': {
                        'RSScore1W': asset_info_doc.get('RSScore1W'),
                        'RSScore1M': asset_info_doc.get('RSScore1M'),
                        'RSScore4M': asset_info_doc.get('RSScore4M')
                    }}
                )
            )

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")

#calculates both 52wk and all time high/low
def calculate_alltime_high_low_and_perc52wk():
    ohclv_data_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Calculating All-Time Highs, Lows, and Percentages...")
    for i, stock in enumerate(tickers):
        try:
            pipeline = [
                {'$match': {'tickerID': stock}},
                {'$project': {'_id': 0, 'close': 1}}
            ]
            documents = list(ohclv_data_collection.aggregate(pipeline))

            close_values = []
            for doc in documents:
                close_value = doc['close']
                try:
                    close_value = float(close_value)
                    close_values.append(close_value)
                except ValueError:
                    # Handle non-numeric values (e.g., log a warning, skip the value, etc.)
                    print(f"Warning: Non-numeric value '{close_value}' found in 'close' field for ticker {stock}")

            if close_values:
                alltime_high = max(close_values)
                alltime_low = min(close_values)
                recent_close = close_values[0]
            else:
                alltime_high = 0
                alltime_low = 0
                recent_close = 0

            asset_info_filter = {'Symbol': stock}
            asset_info_doc = asset_info_collection.find_one(asset_info_filter)
            if asset_info_doc:
                fifty_two_week_high = asset_info_doc.get('52WeekHigh', 0)
                fifty_two_week_low = asset_info_doc.get('52WeekLow', 0)
                if fifty_two_week_high != 0:
                    perc_off_52_week_high = ((recent_close - fifty_two_week_high) / fifty_two_week_high) 
                else:
                    perc_off_52_week_high = 0
                if fifty_two_week_low != 0:
                    perc_off_52_week_low = ((recent_close - fifty_two_week_low) / fifty_two_week_low) 
                else:
                    perc_off_52_week_low = 0
                updates.append(
                    UpdateOne(
                        asset_info_filter,
                        {'$set': {
                            'AlltimeHigh': alltime_high,
                            'AlltimeLow': alltime_low,
                            'percoff52WeekHigh': perc_off_52_week_high,
                            'percoff52WeekLow': perc_off_52_week_low
                        }}
                    )
                )
            print(f"Processed {i+1} out of {len(tickers)} stocks")
        except Exception as e:
            print(f"Error processing {stock}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
 
#caluclautes percentage changes for today, wk, 1m, 4m, 6m, 1y, and YTD (althought ytd is still a bit weird)
def calculate_change_perc():
    ohclv_collection = db['OHCLVData']
    asset_info_collection = db['AssetInfo']
    updates = []

    print("Calculating Percentage Changes...")
    for i, stock in enumerate(tickers):
        try:
            pipeline = [
                {'$match': {'tickerID': stock}},
                {'$sort': {'timestamp': 1}},
                {'$project': {'_id': 0, 'close': 1, 'timestamp': 1}}
            ]
            documents = list(ohclv_collection.aggregate(pipeline))

            if len(documents) < 2:
                percentage_changes = {
                    'todaychange': 'N/A',
                    'weekchange': 'N/A',
                    '1mchange': 'N/A',
                    '4mchange': 'N/A',
                    '6mchange': 'N/A',
                    '1ychange': 'N/A',
                    'ytdchange': 'N/A'
                }
            else:
                close_values = {doc['timestamp']: doc['close'] for doc in documents}
                today_close = close_values.get(sorted(close_values.keys())[-1])
                yesterday_close = close_values.get(sorted(close_values.keys())[-2]) if len(close_values) > 1 else 0
                last_week_close = close_values.get(sorted(close_values.keys())[-6]) if len(close_values) > 5 else 0
                first_month_close = close_values.get(sorted(close_values.keys())[-20]) if len(close_values) > 19 else 0
                fourth_month_close = close_values.get(sorted(close_values.keys())[-80]) if len(close_values) > 79 else 0
                sixth_month_close = close_values.get(sorted(close_values.keys())[-120]) if len(close_values) > 119 else 0
                one_year_close = close_values.get(sorted(close_values.keys())[-250]) if len(close_values) > 249 else 0

                ytd_keys = [key for key in close_values if key.year == datetime.today().year]
                if ytd_keys:
                    ytd_close = close_values.get(min(ytd_keys))
                    ytd_change = ((today_close - ytd_close) / today_close) if ytd_close != 0 else 'N/A'
                else:
                    ytd_change = 'N/A'

                percentage_changes = {
                    'todaychange': ((today_close - yesterday_close) / today_close) if yesterday_close != 0 else 'N/A',
                    'weekchange': ((today_close - last_week_close) / today_close) if last_week_close != 0 else 'N/A',
                    '1mchange': ((today_close - first_month_close) / today_close) if first_month_close != 0 else 'N/A',
                    '4mchange': ((today_close - fourth_month_close) / today_close) if fourth_month_close != 0 else 'N/A',
                    '6mchange': ((today_close - sixth_month_close) / today_close) if sixth_month_close != 0 else 'N/A',
                    '1ychange': ((today_close - one_year_close) / today_close) if one_year_close != 0 else 'N/A',
                    'ytdchange': ytd_change
                }
            updates.append(
                UpdateOne(
                    {'Symbol': stock},
                    {'$set': percentage_changes}
                )
            )
            print(f"Processed {i+1} out of {len(tickers)} stocks")
        except Exception as e:
            print(f"Error processing {stock}: {e}")

    if updates:
        try:
            result = asset_info_collection.bulk_write(updates)
            print(f"Updated {result.modified_count} documents")
        except Exception as e:
            print(f"Error updating documents: {e}")
        
        
def calculate_qoq_changes():
    collection = db['AssetInfo']
    for i in tqdm(tickers):
        doc = collection.find_one({'Symbol': i})
        if doc:
            quarterly_income = doc.get('quarterlyIncome', [])
            quarterly_earnings = doc.get('quarterlyEarnings', [])
            total_revenue = [float(x.get('totalRevenue', 0)) for x in quarterly_income if x.get('totalRevenue') not in ['', 'None', None]]
            net_income = [float(x.get('netIncome', 0)) for x in quarterly_income if x.get('netIncome') not in ['', 'None', None]]
            reported_eps = [float(x.get('reportedEPS', 0)) for x in quarterly_earnings if x.get('reportedEPS') not in ['', 'None', None]]
            if len(total_revenue) > 1:
                current_quarter = total_revenue[0]
                previous_quarter = total_revenue[1]
                if previous_quarter != 0:
                    revenue_qoq = ((current_quarter - previous_quarter) / previous_quarter) 
                else:
                    revenue_qoq = 0
            else:
                revenue_qoq = 0
            if len(net_income) > 1:
                current_quarter = net_income[0]
                previous_quarter = net_income[1]
                if previous_quarter != 0:
                    earnings_qoq = ((current_quarter - previous_quarter) / previous_quarter) 
                else:
                    earnings_qoq = 0
            else:
                earnings_qoq = 0
            if len(reported_eps) > 1:
                current_quarter = reported_eps[0]
                previous_quarter = reported_eps[1]
                if previous_quarter != 0:
                    eps_qoq = ((current_quarter - previous_quarter) / previous_quarter) 
                else:
                    eps_qoq = 0
            else:
                eps_qoq = 0
            collection.update_one({'Symbol': i}, {'$set': {
                'EPSQoQ': eps_qoq,
                'EarningsQoQ': earnings_qoq,
                'RevQoQ': revenue_qoq
            }})

def calculate_YoY_changes():
    collection = db['AssetInfo']
    for i in tqdm(tickers):
        doc = collection.find_one({'Symbol': i})
        if doc:
            quarterly_income = doc.get('quarterlyIncome', [])
            quarterly_earnings = doc.get('quarterlyEarnings', [])
            total_revenue = [float(x.get('totalRevenue', 0)) for x in quarterly_income if x.get('totalRevenue') not in ['', 'None', None]]
            net_income = [float(x.get('netIncome', 0)) for x in quarterly_income if x.get('netIncome') not in ['', 'None', None]]
            reported_eps = [float(x.get('reportedEPS', 0)) for x in quarterly_earnings if x.get('reportedEPS') not in ['', 'None', None]]
            if len(total_revenue) >= 5:
                current_quarter = total_revenue[0]
                previous_quarter = total_revenue[4]
                if previous_quarter != 0:
                    revenue_qoq = ((current_quarter - previous_quarter) / previous_quarter) 
                else:
                    revenue_qoq = 0
            else:
                revenue_qoq = 0
            if len(net_income) >= 5:
                current_quarter = net_income[0]
                previous_quarter = net_income[4]
                if previous_quarter != 0:
                    earnings_qoq = ((current_quarter - previous_quarter) / previous_quarter) 
                else:
                    earnings_qoq = 0
            else:
                earnings_qoq = 0
            if len(reported_eps) >= 5:
                current_quarter = reported_eps[0]
                previous_quarter = reported_eps[4]
                if previous_quarter != 0:
                    eps_qoq = ((current_quarter - previous_quarter) / previous_quarter) 
                else:
                    eps_qoq = 0
            else:
                eps_qoq = 0
            collection.update_one({'Symbol': i}, {'$set': {
                'EPSYoY': eps_qoq,
                'EarningsYoY': earnings_qoq,
                'RevYoY': revenue_qoq
            }})

def getFinancials():
    collection = db['AssetInfo']

    for ticker in tickers:
        url = f'https://api.tiingo.com/tiingo/fundamentals/{ticker}/statements?token={api_key}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            # Find the document in MongoDB where Symbol matches the ticker
            result = collection.find_one({'Symbol': ticker})

            if result:
                # Clear existing data
                collection.update_one({'Symbol': ticker}, {'$set': {
                    'annualEarnings': [],
                    'quarterlyEarnings': [],
                    'AnnualFinancials': [],
                    'quarterlyFinancials': []
                }})

                # Process the data
                for statement in data:
                    date_str = statement['date']
                    date = datetime.strptime(date_str, '%Y-%m-%d')
                    quarter = statement['quarter']

                    if 'statementData' in statement and 'incomeStatement' in statement['statementData']:
                        income_statement = statement['statementData']['incomeStatement']
                        eps = next((item for item in income_statement if item['dataCode'] == 'eps'), None)
                        revenue = next((item for item in income_statement if item['dataCode'] == 'revenue'), None)
                        netinc = next((item for item in income_statement if item['dataCode'] == 'netinc'), None)

                        if eps:
                            eps_value = eps['value']
                            if quarter == 0:
                                collection.update_one({'Symbol': ticker}, {'$push': {
                                    'annualEarnings': {
                                        'fiscalDateEnding': date,
                                        'reportedEPS': eps_value
                                    }
                                }})
                            else:
                                collection.update_one({'Symbol': ticker}, {'$push': {
                                    'quarterlyEarnings': {
                                        'fiscalDateEnding': date,
                                        'reportedEPS': eps_value
                                    }
                                }})

                        if revenue and netinc:
                            revenue_value = revenue['value']
                            netinc_value = netinc['value']
                            financial_data = {
                                'fiscalDateEnding': date,
                                'totalRevenue': revenue_value,
                                'netIncome': netinc_value
                            }

                            if 'balanceSheet' in statement['statementData']:
                                balance_sheet = statement['statementData']['balanceSheet']
                                for item in balance_sheet:
                                    data_code = item['dataCode']
                                    value = item['value']
                                    financial_data[data_code] = value

                            if 'cashFlow' in statement['statementData']:
                                cash_flow = statement['statementData']['cashFlow']
                                for item in cash_flow:
                                    data_code = item['dataCode']
                                    value = item['value']
                                    financial_data[data_code] = value

                            if 'overview' in statement['statementData']:
                                overview = statement['statementData']['overview']
                                for item in overview:
                                    data_code = item['dataCode']
                                    value = item['value']
                                    financial_data[data_code] = value

                            if quarter == 0:
                                collection.update_one({'Symbol': ticker}, {'$push': {
                                    'AnnualFinancials': financial_data
                                }})
                            else:
                                collection.update_one({'Symbol': ticker}, {'$push': {
                                    'quarterlyFinancials': financial_data
                                }})
                print(f"Successfully updated financial data for {ticker}")
            else:
                print(f"No document found for {ticker}")
        else:
            print(f"Error fetching data for {ticker}: {response.status_code}")
            

def update_eps_shares_dividend_date():
    try:
        collection = db['AssetInfo']

        # Iterate over each ticker
        for ticker in tickers:
            # Find the document corresponding to the current ticker
            document = collection.find_one({'Symbol': ticker})

            if document:
                # Check if the quarterlyEarnings array is not empty
                if 'quarterlyEarnings' in document and document['quarterlyEarnings']:
                    # Extract the reportedEPS from the first object in the quarterlyEarnings array
                    reported_eps = document['quarterlyEarnings'][0].get('reportedEPS')

                    # Update the EPS attribute of the document
                    if reported_eps is not None:
                        collection.update_one({'Symbol': ticker}, {'$set': {'EPS': reported_eps}})

                # Check if the quarterlyFinancials array is not empty
                if 'quarterlyFinancials' in document and document['quarterlyFinancials']:
                    # Extract the sharesBasic from the first object in the quarterlyFinancials array
                    shares_basic = document['quarterlyFinancials'][0].get('sharesBasic')

                    # Update the SharesOutstanding attribute of the document
                    if shares_basic is not None:
                        collection.update_one({'Symbol': ticker}, {'$set': {'SharesOutstanding': shares_basic}})

                # Check if the dividends array is not empty
                if 'dividends' in document and document['dividends']:
                    # Extract the payment_date from the last object in the dividends array
                    payment_date = document['dividends'][-1].get('payment_date')

                    # Update the DividendDate attribute of the document
                    if payment_date is not None:
                        collection.update_one({'Symbol': ticker}, {'$set': {'DividendDate': payment_date}})
        print("Update successful")

    except Exception as e:
        print("Update failed: ", str(e))

    
def getHistoricalPrice():
    daily_collection = db["OHCLVData"]
    weekly_collection = db["OHCLVData2"]

    for ticker in tickers:
        now = datetime.now()
        url = f'https://api.tiingo.com/tiingo/daily/{ticker}/prices?token={api_key}&startDate=1990-01-01&endDate={now.strftime("%Y-%m-%d")}'
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            if len(data) > 0:
                df = pd.DataFrame(data)
                df = df.rename(columns={'date': 'timestamp'})
                df.columns = ['timestamp', 'close', 'high', 'low', 'open', 'volume', 'adjClose', 'adjHigh', 'adjLow', 'adjOpen', 'adjVolume', 'divCash', 'splitFactor']
                df['tickerID'] = ticker
                
                # Convert NumPy types to Python native types
                def convert_numpy_types(doc):
                    return {
                        k: (int(v) if isinstance(v, np.integer) else 
                            float(v) if isinstance(v, np.floating) else 
                            v) for k, v in doc.items()
                    }
                
                # Convert dataframe to list of dictionaries
                daily_data_dict = df[['tickerID', 'timestamp', 'adjOpen', 'adjHigh', 'adjLow', 'adjClose', 'adjVolume', 'divCash', 'splitFactor']].to_dict(orient='records')
                daily_data_dict = [convert_numpy_types(doc) for doc in daily_data_dict]

                # Rename fields
                for doc in daily_data_dict:
                    doc['open'] = doc.pop('adjOpen')
                    doc['high'] = doc.pop('adjHigh')
                    doc['low'] = doc.pop('adjLow')
                    doc['close'] = doc.pop('adjClose')
                    doc['volume'] = doc.pop('adjVolume')
                    doc['timestamp'] = datetime.strptime(doc['timestamp'], '%Y-%m-%dT%H:%M:%S.%fZ')

                # Insert daily documents, preventing duplicates
                for daily_doc in daily_data_dict:
                    existing_daily_doc = daily_collection.find_one({
                        'tickerID': daily_doc['tickerID'], 
                        'timestamp': daily_doc['timestamp']
                    })
                    
                    if not existing_daily_doc:
                        daily_collection.insert_one(daily_doc)
                        
                # Process weekly data from daily data
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                weekly_grouped = df.groupby(pd.Grouper(key='timestamp', freq='W-MON'))
                
                for week_start, week_data in weekly_grouped:
                    if not week_data.empty:
                        weekly_doc = {
                            'tickerID': ticker,
                            'timestamp': week_start.to_pydatetime(),
                            'open': float(week_data['adjOpen'].iloc[0]),
                            'high': float(week_data['adjHigh'].max()),
                            'low': float(week_data['adjLow'].min()),
                            'close': float(week_data['adjClose'].iloc[-1]),
                            'volume': int(week_data['adjVolume'].sum())
                        }
                        
                        # Check if weekly document already exists
                        existing_weekly_doc = weekly_collection.find_one({
                            'tickerID': ticker, 
                            'timestamp': weekly_doc['timestamp']
                        })
                        
                        if not existing_weekly_doc:
                            weekly_collection.insert_one(weekly_doc)
                print(f"Successfully processed {ticker}")
            else:
                print(f"No data found for {ticker}")
        else:
            print(f"Error: {response.text}")


#run every day
def Daily():
    set_maintenance_mode(True)
    
    functions = [
        ('getPrice', getPrice),
        ('updateDailyRatios', updateDailyRatios),
        ('updateSplits', getSplits),
        ('updateDividends', getDividends),
        ('update_timeseries', update_asset_info_with_time_series),
        ('calculate_volumes', calculate_volumes),
        ('calculate_moving_averages', calculate_moving_averages),
        ('calculate_rs_scores', calculate_rs_scores),
        ('calculate__high_low', calculate_alltime_high_low_and_perc52wk),
        ('calculate_change_perc', calculate_change_perc),
    ]

    execution_times = {}
    start_time = time.time()
    
    for func_name, func in functions:
        func_start_time = time.time()
        func()
        func_end_time = time.time()
        execution_times[func_name] = func_end_time - func_start_time

    end_time = time.time()
    total_execution_time = end_time - start_time

    print('Execution times:')
    for func_name, execution_time in execution_times.items():
        print(f'{func_name} took {execution_time:.2f} seconds to execute')
    
    print(f'\nTotal execution time: {total_execution_time:.2f} seconds')
    set_maintenance_mode(False)

scheduler = BackgroundScheduler()
#scheduler.add_job(Daily, 'interval', minutes=20) 
scheduler.start()

Daily()