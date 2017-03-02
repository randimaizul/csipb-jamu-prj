db_compound
db_drug

[ ] Pubchem
https://pubchemblog.ncbi.nlm.nih.gov/2014/06/19/what-is-the-difference-between-a-substance-and-a-compound-in-pubchem/

[ ] DRUGBANK
http://www.drugbank.ca/drugs/DB00114

KEGG compound
http://www.genome.jp/dbget-bin/www_bfind?compound
ftp://ftp.genome.jp/pub/kegg/medicus/drug/kcf/
KEGG Compound Database
Release 80.0+/10-09, Oct 16
Kanehisa Laboratories
17,765 entries

===
Get KCF file from KEGG-compound to compute similarity using simcomp

http://www.genome.jp/dbget-bin/www_bget?-f+k+compound+C00032

===

Get MOL file
http://www.genome.jp/dbget-bin/www_bget?-f+m+compound+C00022
===
Get simScore

http://www.genome.jp/tools/gn_tools_api.html
http://rest.genome.jp/simcomp/C00022/knapsack/cutoff=0.1/kcfoutput=on
curl -F smiles='O=C(C(=O)O)C' -F cutoff=0.6 -F limit=10 http://rest.genome.jp/simcomp/
http://rest.genome.jp/simcomp/C00022/compound/cutoff=0.000001
http://rest.genome.jp/simcomp/C00022/compound/cutoff=0.6/dnode= 2/atom=2/trick=2/trickatom=0/limit=10/chiral=off

===
Get smiles
http://www.drugbank.ca/structures/structures/small_molecule_drugs/DB01628.smiles

===
convertion services

http://cts.fiehnlab.ucdavis.edu/
http://webbook.nist.gov/chemistry/cas-ser.html

https://www.chemspider.com/InChI.asmx

http://openbabel.org/